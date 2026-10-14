import { cn } from '@/src/lib/utils';
import { Slot } from '@rn-primitives/slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { Platform, Text as RNText, type Role } from 'react-native';
import { useTheme } from '@/src/theme/useTheme';

const textVariants = cva(
  cn(
    'text-base',
    Platform.select({
      web: 'select-text',
    })
  ),
  {
    variants: {
      variant: {
        default: '',
        h1: cn(
          'text-center text-4xl font-extrabold tracking-tight',
          Platform.select({ web: 'scroll-m-20 text-balance' })
        ),
        h2: cn(
          'border-border border-b pb-2 text-3xl font-semibold tracking-tight',
          Platform.select({ web: 'scroll-m-20 first:mt-0' })
        ),
        h3: cn('text-2xl font-semibold tracking-tight', Platform.select({ web: 'scroll-m-20' })),
        h4: cn('text-xl font-semibold tracking-tight', Platform.select({ web: 'scroll-m-20' })),
        p: 'mt-3 leading-7 sm:mt-6',
        blockquote: 'mt-4 border-l-2 pl-3 italic sm:mt-6 sm:pl-6',
        code: cn(
          'bg-muted relative rounded px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold'
        ),
        lead: 'text-xl',
        large: 'text-lg font-semibold',
        small: 'text-sm font-medium leading-none',
        muted: 'text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

type TextVariantProps = VariantProps<typeof textVariants>;

type TextVariant = NonNullable<TextVariantProps['variant']>;

const ROLE: Partial<Record<TextVariant, Role>> = {
  h1: 'heading',
  h2: 'heading',
  h3: 'heading',
  h4: 'heading',
  blockquote: Platform.select({ web: 'blockquote' as Role }),
  code: Platform.select({ web: 'code' as Role }),
};

const ARIA_LEVEL: Partial<Record<TextVariant, string>> = {
  h1: '1',
  h2: '2',
  h3: '3',
  h4: '4',
};

/** Variants that use mutedForeground color instead of foreground */
const MUTED_VARIANTS: Set<TextVariant> = new Set(['muted', 'lead']);

const TextClassContext = React.createContext<string | undefined>(undefined);

function Text({
  className,
  asChild = false,
  variant = 'default',
  style,
  ...props
}: React.ComponentProps<typeof RNText> &
  React.RefAttributes<typeof RNText> &
  TextVariantProps & {
    asChild?: boolean;
  }) {
  const textClass = React.useContext(TextClassContext);
  const { colors } = useTheme();
  const Component = asChild ? Slot : RNText;

  // Determine the default color based on variant.
  // This is the *fallback* color — any explicit `color` in `style` takes precedence
  // because it comes later in the array.
  const defaultColor =
    variant && MUTED_VARIANTS.has(variant as TextVariant)
      ? colors.mutedForeground
      : colors.foreground;

  return (
    <Component
      className={cn(textVariants({ variant }), textClass, className)}
      role={variant ? ROLE[variant] : undefined}
      aria-level={variant ? ARIA_LEVEL[variant] : undefined}
      style={[{ color: defaultColor, fontFamily: 'Inter', includeFontPadding: false }, style]}
      {...props}
    />
  );
}

export { Text, TextClassContext };

