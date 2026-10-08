import React, { useState, useMemo } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Clipboard } from 'react-native';
import { Text } from '@/src/components/ui/text';
import Markdown from 'react-native-markdown-display';
import { SvgXml } from 'react-native-svg';
import { Code2, Copy, Check } from 'lucide-react-native';
import { useTheme } from '@/src/theme/useTheme';
import { renderLatexToSvg } from '@/src/utils/latexRenderer';

interface FormattedMessageBodyProps {
  content: string;
}

/**
 * Preprocesses markdown text containing math expressions:
 * - Converts display math $$...$$ and \[...\] and standalone environments to ```math ... ``` fences so markdown-it
 *   treats them as verbatim block code without escaping LaTeX backslashes or converting subscripts to italics.
 * - Converts inline math $...$ and \(...\) to `$$math:...$$` code spans so markdown-it
 *   preserves the LaTeX characters intact inside inline code tokens.
 * - Leaves existing code fences and inline code completely untouched.
 */
function preprocessMathInMarkdown(raw: string): string {
  if (!raw) return '';

  // Split content by code fences (```...```) to avoid processing math inside actual code blocks
  const fenceRegex = /(```[\s\S]*?```)/g;
  const parts = raw.split(fenceRegex);

  return parts
    .map((part) => {
      // If this part is a code fence, preserve it as-is
      if (part.startsWith('```')) {
        return part;
      }

      // Also protect inline code spans (`...`)
      const inlineCodeRegex = /(`[^`]+`)/g;
      const subParts = part.split(inlineCodeRegex);

      return subParts
        .map((subPart) => {
          if (subPart.startsWith('`')) {
            return subPart;
          }

          let processed = subPart;

          // 1. Standalone LaTeX display environments outside fences
          processed = processed.replace(
            /\\begin\{(equation\*?|align\*?|gather\*?|multline\*?)\}([\s\S]+?)\\end\{\1\}/g,
            (match) => `\n\n\`\`\`math\n${match.trim()}\n\`\`\`\n\n`
          );

          // 2. Display / Block Math: $$...$$ or \[...\]
          processed = processed.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
            const clean = math.trim();
            return `\n\n\`\`\`math\n${clean}\n\`\`\`\n\n`;
          });

          processed = processed.replace(/\\\[([\s\S]+?)\\\]/g, (_, math) => {
            const clean = math.trim();
            return `\n\n\`\`\`math\n${clean}\n\`\`\`\n\n`;
          });

          // 3. Inline Math: \(...\)
          processed = processed.replace(/\\\(([\s\S]+?)\\\)/g, (_, math) => {
            const clean = math.trim();
            return `\`$$math:${clean}$$\``;
          });

          // 4. Inline Math: $...$
          // Matches $formula$ ensuring no spaces immediately inside delimiters and not plain currency ($100)
          processed = processed.replace(
            /(?<![\w\$])\$(?!\s)([^\n\$]+?)(?<!\s)\$(?![\w\$])/g,
            (match, math) => {
              const clean = math.trim();
              // Don't treat standalone plain currency numbers as math (e.g. $50 or $12.50)
              if (/^\d+(\.\d+)?$/.test(clean)) {
                return match;
              }
              return `\`$$math:${clean}$$\``;
            }
          );

          return processed;
        })
        .join('');
    })
    .join('');
}

function CodeBlockItem({ code, language }: { code: string; language: string }) {
  const { colors, isDark } = useTheme();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    Clipboard.setString(code.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View
      style={[
        styles.codeBlock,
        {
          backgroundColor: isDark ? '#0A0C12' : '#F4F4F6',
          borderColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.codeHeader,
          {
            borderBottomColor: colors.border,
            backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          },
        ]}
      >
        <View style={styles.codeLangPill}>
          <Code2 size={13} color="#6366F1" />
          <Text style={[styles.codeLangText, { color: colors.foreground }]}>
            {language || 'code'}
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.copyCodeBtn,
            { backgroundColor: colors.card, borderColor: colors.border },
            pressed && { opacity: 0.75 },
          ]}
          onPress={handleCopy}
          hitSlop={6}
        >
          {copied ? (
            <>
              <Check size={12} color="#10B981" />
              <Text style={styles.copiedCodeText}>Copied</Text>
            </>
          ) : (
            <>
              <Copy size={12} color={colors.mutedForeground} />
              <Text style={[styles.copyCodeText, { color: colors.mutedForeground }]}>
                Copy
              </Text>
            </>
          )}
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        nestedScrollEnabled={true}
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        style={styles.codeScroll}
      >
        <Text
          style={[
            styles.codeText,
            { color: isDark ? '#E2E8F0' : '#1E293B' },
          ]}
          selectable
        >
          {code}
        </Text>
      </ScrollView>
    </View>
  );
}

function MathBlockItem({ latex }: { latex: string }) {
  const { colors, isDark } = useTheme();
  const [showRaw, setShowRaw] = useState(false);
  const [copied, setCopied] = useState(false);

  // High-contrast math color: crisp white in dark mode, deep zinc in light mode
  const mathColor = isDark ? '#F8FAFC' : '#09090B';

  const rendered = useMemo(() => {
    return renderLatexToSvg(latex, {
      display: true,
      color: mathColor,
      fontSize: 17,
    });
  }, [latex, mathColor]);

  const handleCopy = () => {
    Clipboard.setString(latex.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isRenderSuccess = rendered !== null;
  const isDisplayingRaw = showRaw || !isRenderSuccess;

  return (
    <View
      style={[
        styles.mathBlockCard,
        {
          backgroundColor: isDark ? '#0D101A' : '#F8FAFC',
          borderColor: isDark ? 'rgba(99, 102, 241, 0.22)' : '#E2E8F0',
        },
      ]}
    >
      {/* Formula Window Header */}
      <View
        style={[
          styles.mathHeader,
          {
            borderBottomColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#E2E8F0',
            backgroundColor: isDark ? 'rgba(99, 102, 241, 0.08)' : 'rgba(99, 102, 241, 0.04)',
          },
        ]}
      >
        <View style={styles.mathHeaderLeft}>
          <View style={styles.mathBadge}>
            <Text style={styles.mathBadgeText}>fx</Text>
          </View>
          <Text style={[styles.mathHeaderTitle, { color: colors.foreground }]}>
            EQUATION
          </Text>
        </View>

        <View style={styles.mathHeaderActions}>
          {isRenderSuccess && (
            <Pressable
              style={({ pressed }) => [
                styles.mathToggleBtn,
                {
                  backgroundColor: showRaw
                    ? (isDark ? 'rgba(99, 102, 241, 0.25)' : 'rgba(99, 102, 241, 0.12)')
                    : (isDark ? '#161A26' : '#FFFFFF'),
                  borderColor: isDark ? 'rgba(99, 102, 241, 0.25)' : colors.border,
                },
                pressed && { opacity: 0.75 },
              ]}
              onPress={() => setShowRaw(!showRaw)}
              hitSlop={8}
            >
              <Text
                style={[
                  styles.mathToggleText,
                  { color: showRaw ? '#6366F1' : colors.mutedForeground },
                ]}
              >
                {showRaw ? 'Formula' : 'TeX'}
              </Text>
            </Pressable>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.copyMathBtn,
              {
                backgroundColor: isDark ? '#161A26' : '#FFFFFF',
                borderColor: isDark ? 'rgba(99, 102, 241, 0.25)' : colors.border,
              },
              pressed && { opacity: 0.75 },
            ]}
            onPress={handleCopy}
            hitSlop={8}
          >
            {copied ? (
              <>
                <Check size={11} color="#10B981" />
                <Text style={styles.copiedMathText}>Copied</Text>
              </>
            ) : (
              <>
                <Copy size={11} color={colors.mutedForeground} />
                <Text style={[styles.copyMathText, { color: colors.mutedForeground }]}>
                  Copy
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </View>

      {/* Formula Window Content */}
      {isDisplayingRaw ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          style={styles.mathRawScroll}
          contentContainerStyle={styles.mathRawContent}
        >
          <Text
            style={[
              styles.mathRawText,
              { color: isDark ? '#E2E8F0' : '#1E293B' },
            ]}
            selectable
          >
            {latex.trim()}
          </Text>
        </ScrollView>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={true}
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          style={styles.mathScroll}
          contentContainerStyle={styles.mathScrollContent}
          bounces={false}
        >
          <View style={styles.mathSvgWrapper}>
            <SvgXml
              xml={rendered.xml}
              width={rendered.widthPx}
              height={rendered.heightPx}
              color={mathColor}
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
}

function InlineMathItem({ latex }: { latex: string }) {
  const { isDark } = useTheme();
  const mathColor = isDark ? '#F8FAFC' : '#09090B';

  const rendered = useMemo(() => {
    return renderLatexToSvg(latex, {
      display: false,
      color: mathColor,
      fontSize: 14,
    });
  }, [latex, mathColor]);

  if (!rendered) {
    return (
      <Text
        style={[
          styles.inlineFallbackText,
          {
            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F4F4F5',
            color: '#6366F1',
          },
        ]}
      >
        {latex}
      </Text>
    );
  }

  return (
    <View
      style={[
        styles.inlineMathWrap,
        {
          marginBottom: rendered.verticalAlignPx,
        },
      ]}
    >
      <SvgXml
        xml={rendered.xml}
        width={rendered.widthPx}
        height={rendered.heightPx}
        color={mathColor}
      />
    </View>
  );
}

export function FormattedMessageBody({ content }: FormattedMessageBodyProps) {
  const { colors, isDark } = useTheme();
  const processedContent = preprocessMathInMarkdown(content);

  const markdownStyles = {
    body: {
      color: colors.foreground,
      fontSize: 14,
      lineHeight: 21,
    },
    strong: {
      color: colors.foreground,
      fontWeight: '700' as const,
    },
    em: {
      fontStyle: 'italic' as const,
      color: colors.mutedForeground,
    },
    heading1: {
      color: colors.foreground,
      fontSize: 16,
      fontWeight: '800' as const,
      marginBottom: 6,
      marginTop: 4,
    },
    heading2: {
      color: colors.foreground,
      fontSize: 15,
      fontWeight: '700' as const,
      marginBottom: 4,
      marginTop: 4,
    },
    heading3: {
      color: '#6366F1',
      fontSize: 14,
      fontWeight: '700' as const,
      marginBottom: 4,
      marginTop: 2,
    },
    bullet_list: {
      marginTop: 4,
      marginBottom: 4,
    },
    ordered_list: {
      marginTop: 4,
      marginBottom: 4,
    },
    list_item: {
      color: colors.foreground,
      fontSize: 14,
      lineHeight: 21,
    },
    code_inline: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#F4F4F5',
      color: '#6366F1',
      fontSize: 12,
      borderRadius: 4,
      paddingHorizontal: 5,
      paddingVertical: 1,
      fontFamily: 'monospace',
    },
    blockquote: {
      backgroundColor: isDark ? 'rgba(99, 102, 241, 0.08)' : '#EEF2FF',
      borderLeftWidth: 3,
      borderLeftColor: '#6366F1',
      paddingLeft: 10,
      paddingVertical: 4,
      marginVertical: 4,
    },
    hr: {
      backgroundColor: colors.border,
      height: 1,
      marginVertical: 8,
    },
    link: {
      color: '#6366F1',
      textDecorationLine: 'underline' as const,
    },
    paragraph: {
      marginBottom: 6,
      marginTop: 0,
    },
  };

  const customRules: any = {
    // Custom Code Fence: handles math blocks and syntax-styled code blocks
    fence: (node: any) => {
      const language = (node.sourceInfo || '').trim().toLowerCase();
      const code = node.content || '';

      if (language === 'math' || language === 'latex' || language === 'tex' || language === 'equation') {
        return <MathBlockItem key={node.key} latex={code.trim()} />;
      }

      return (
        <CodeBlockItem
          key={node.key}
          code={code}
          language={language}
        />
      );
    },

    // Custom Inline Code: handles math spans like `$$math:E = mc^2$$`
    code_inline: (node: any, children: any, parent: any, stylesObj: any) => {
      const rawText = node.content || '';

      if (rawText.startsWith('$$math:') && rawText.endsWith('$$')) {
        const latex = rawText.slice(7, -2).trim();
        return <InlineMathItem key={node.key} latex={latex} />;
      }

      return (
        <Text key={node.key} style={stylesObj.code_inline}>
          {rawText}
        </Text>
      );
    },
  };

  return (
    <Markdown style={markdownStyles} rules={customRules}>
      {processedContent}
    </Markdown>
  );
}

const styles = StyleSheet.create({
  // ── Code Block ────────────────────────────────────────────────────────────
  codeBlock: {
    borderRadius: 10,
    borderWidth: 1,
    marginVertical: 8,
    overflow: 'hidden',
  },
  codeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderBottomWidth: 1,
  },
  codeLangPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  codeLangText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    includeFontPadding: false,
  },
  copyCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  copyCodeText: {
    fontSize: 10,
    fontWeight: '600',
    includeFontPadding: false,
  },
  copiedCodeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#10B981',
    includeFontPadding: false,
  },
  codeScroll: {
    padding: 12,
  },
  codeText: {
    fontFamily: 'monospace',
    fontSize: 12,
    lineHeight: 18,
  },
  // ── Math Block ────────────────────────────────────────────────────────────
  mathBlockCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginVertical: 8,
    overflow: 'hidden',
  },
  mathHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderBottomWidth: 1,
  },
  mathHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mathBadge: {
    width: 20,
    height: 18,
    borderRadius: 4,
    backgroundColor: '#6366F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mathBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
    fontStyle: 'italic',
    includeFontPadding: false,
  },
  mathHeaderTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    includeFontPadding: false,
  },
  mathHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mathToggleBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    minHeight: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mathToggleText: {
    fontSize: 10,
    fontWeight: '600',
    includeFontPadding: false,
  },
  copyMathBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    minHeight: 24,
    justifyContent: 'center',
  },
  copyMathText: {
    fontSize: 10,
    fontWeight: '600',
    includeFontPadding: false,
  },
  copiedMathText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#10B981',
    includeFontPadding: false,
  },
  mathScroll: {
    minHeight: 48,
  },
  mathScrollContent: {
    minWidth: '100%',
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mathSvgWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mathRawScroll: {
    padding: 12,
  },
  mathRawContent: {
    minWidth: '100%',
  },
  mathRawText: {
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 20,
  },
  inlineMathWrap: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  inlineFallbackText: {
    fontSize: 12,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    fontFamily: 'monospace',
  },
});
