import { scoreTier, type ScoreTier } from "@espressoir/core";
import { router, type Href } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { formatScore } from "@/lib/format";
import { format, t } from "@/lib/i18n";
import { fonts, useColors } from "@/lib/theme";

/** A page title set like the heading of a form: wide and heavy, ending in the red dot. */
export function Heading({ children, kicker }: { children: string; kicker?: string }) {
  const colors = useColors();
  return (
    <View
      style={{
        paddingTop: 24,
        paddingBottom: 16,
        borderBottomWidth: 2,
        borderColor: colors.foreground,
      }}
    >
      {/* Names (brands, members, places) stay as written: no uppercasing here. */}
      {kicker ? <Mono muted>{kicker}</Mono> : null}
      <Text
        accessibilityRole="header"
        style={{
          fontFamily: fonts.heading,
          fontSize: 34,
          lineHeight: 36,
          color: colors.foreground,
          marginTop: kicker ? 6 : 0,
        }}
      >
        {children}
        <Text style={{ color: colors.brand }}>.</Text>
      </Text>
    </View>
  );
}

/** A numbered section heading under a hard rule, as on the site. */
export function SectionHeading({ index, children }: { index: number; children: string }) {
  const colors = useColors();
  return (
    <View
      style={{
        marginTop: 24,
        paddingBottom: 6,
        borderBottomWidth: 1,
        borderColor: colors.foreground,
      }}
    >
      <Text
        accessibilityRole="header"
        style={{
          fontFamily: fonts.mono,
          fontSize: 12,
          letterSpacing: 0.6,
          color: colors.foreground,
        }}
      >
        {String(index).padStart(2, "0")} — {children.toLocaleUpperCase("tr")}
      </Text>
    </View>
  );
}

/** Small capitals in the mono face: field labels, kickers. */
export function Label({ children, style }: { children: React.ReactNode; style?: TextStyle }) {
  const colors = useColors();
  return (
    <Text
      style={[
        { fontFamily: fonts.mono, fontSize: 11, letterSpacing: 0.6, color: colors.mutedForeground },
        style,
      ]}
    >
      {typeof children === "string" ? children.toLocaleUpperCase("tr") : children}
    </Text>
  );
}

export function Body({
  children,
  muted,
  style,
}: {
  children: React.ReactNode;
  muted?: boolean;
  style?: TextStyle;
}) {
  const colors = useColors();
  return (
    <Text
      style={[
        {
          fontFamily: fonts.body,
          fontSize: 15,
          lineHeight: 22,
          color: muted ? colors.mutedForeground : colors.foreground,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Mono({
  children,
  muted,
  style,
}: {
  children: React.ReactNode;
  muted?: boolean;
  style?: TextStyle;
}) {
  const colors = useColors();
  return (
    <Text
      style={[
        {
          fontFamily: fonts.mono,
          fontSize: 12,
          lineHeight: 18,
          color: muted ? colors.mutedForeground : colors.foreground,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const SIZES = { sm: 32, md: 54, lg: 76 } as const;

/**
 * The score box: low scores faint outlines, 8 solid ink, 9–10 the red stamp. The number is
 * always printed and read aloud, so colour never carries the meaning alone.
 */
export function ScoreBadge({
  score,
  size = "md",
}: {
  score: number | null;
  size?: keyof typeof SIZES;
}) {
  const colors = useColors();
  const edge = SIZES[size];
  const tier: ScoreTier | null = score === null ? null : scoreTier(Math.round(score));
  const box: ViewStyle = {
    width: edge,
    height: edge,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: size === "sm" ? 1.5 : 2,
    borderColor: colors.input,
  };
  let color = colors.mutedForeground;
  if (tier === "good") {
    box.borderColor = colors.foreground;
    color = colors.foreground;
  } else if (tier === "great") {
    box.borderColor = colors.foreground;
    box.backgroundColor = colors.foreground;
    color = colors.background;
  } else if (tier === "exceptional") {
    box.borderColor = colors.brand;
    box.backgroundColor = colors.brand;
    color = colors.brandForeground;
  }
  const label = score === null ? t.score.none : format(t.score.aria, { score: formatScore(score) });
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={label} style={box}>
      <Text style={{ fontFamily: fonts.heading, fontSize: edge * 0.42, color }}>
        {score === null ? "–" : formatScore(score)}
      </Text>
    </View>
  );
}

/**
 * A ruled row that opens something. A plain Pressable that navigates (not `Link asChild`,
 * which drops a style function, so the row lost its layout).
 */
export function RowLink({
  href,
  children,
  label,
}: {
  href: Href;
  children: React.ReactNode;
  label?: string;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={() => router.push(href)}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderColor: colors.border,
        backgroundColor: pressed ? colors.muted : "transparent",
      })}
    >
      {children}
    </Pressable>
  );
}

export function Button({
  title,
  onPress,
  variant = "solid",
  disabled,
}: {
  title: string;
  onPress: () => void;
  variant?: "solid" | "outline";
  disabled?: boolean;
}) {
  const colors = useColors();
  const solid = variant === "solid";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 46,
        paddingHorizontal: 18,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1.5,
        borderColor: colors.foreground,
        backgroundColor: solid ? colors.foreground : "transparent",
        opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
      })}
    >
      <Text
        style={{
          fontFamily: fonts.mono,
          fontSize: 13,
          letterSpacing: 0.6,
          color: solid ? colors.background : colors.foreground,
        }}
      >
        {title.toLocaleUpperCase("tr")}
      </Text>
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  style,
  ...input
}: TextInputProps & { label: string; hint?: string }) {
  const colors = useColors();
  return (
    <View style={{ gap: 6 }}>
      <Label>{label}</Label>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.mutedForeground}
        {...input}
        // The caller's style adds to the box (a taller note field), never replaces it.
        style={[
          {
            minHeight: 46,
            borderWidth: 1,
            borderColor: colors.input,
            paddingHorizontal: 12,
            fontFamily: fonts.mono,
            fontSize: 16,
            color: colors.foreground,
            backgroundColor: colors.background,
          },
          style,
        ]}
      />
      {hint ? (
        <Mono muted style={{ fontSize: 11 }}>
          {hint}
        </Mono>
      ) : null}
    </View>
  );
}

/** Loading, failed or empty: one line of text, and a way out when there is one. */
export function StateView({
  state,
  onRetry,
  message,
}: {
  state: "loading" | "failed" | "empty";
  onRetry?: () => void;
  message?: string;
}) {
  return (
    <View style={{ paddingVertical: 40, gap: 16, alignItems: "flex-start" }}>
      {state === "loading" ? <ActivityIndicator /> : null}
      <Body muted>
        {message ??
          (state === "loading"
            ? t.mobile.loading
            : state === "failed"
              ? t.mobile.failed
              : t.mobile.noMatches)}
      </Body>
      {state === "failed" && onRetry ? (
        <Button title={t.mobile.retry} variant="outline" onPress={onRetry} />
      ) : null}
    </View>
  );
}
