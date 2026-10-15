import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Platform, Pressable, Text, View } from "react-native";

import { daysBefore } from "@/lib/today";
import { t } from "@/lib/i18n";
import { fonts, useColors } from "@/lib/theme";

import { Label, Mono, SectionHeading } from "./ui";

/** One box of a row of choices: ink when chosen, outline otherwise; big enough for a thumb. */
function Box({
  label,
  selected,
  onPress,
  disabled,
  grow = true,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  disabled?: boolean;
  grow?: boolean;
}) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: Boolean(disabled) }}
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flexGrow: grow ? 1 : 0,
        minWidth: 44,
        minHeight: 44,
        paddingHorizontal: 10,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: selected ? colors.foreground : colors.input,
        backgroundColor: selected ? colors.foreground : pressed ? colors.muted : "transparent",
        opacity: disabled ? 0.4 : 1,
      })}
    >
      <Text
        style={{
          fontFamily: fonts.mono,
          fontSize: 14,
          color: selected ? colors.background : colors.foreground,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Mutually exclusive choices drawn as boxes. With `allowNone`, a second tap clears it. */
export function Choices<T extends string>({
  label,
  options,
  value,
  onChange,
  allowNone = false,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T | null;
  onChange: (value: T | null) => void;
  allowNone?: boolean;
}) {
  return (
    <View style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Label>{label}</Label>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {options.map((option) => (
          <Box
            key={option.value}
            label={option.label}
            selected={value === option.value}
            onPress={() => onChange(allowNone && value === option.value ? null : option.value)}
          />
        ))}
      </View>
    </View>
  );
}

const SCORES = Array.from({ length: 10 }, (_, index) => String(index + 1));

/** The score as ten boxes, two rows of five. */
export function ScoreBoxes({
  label,
  value,
  onChange,
  allowNone = false,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  allowNone?: boolean;
}) {
  return (
    <View style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Label>{label}</Label>
      {[SCORES.slice(0, 5), SCORES.slice(5)].map((row) => (
        <View key={row[0]} style={{ flexDirection: "row", gap: 6 }}>
          {row.map((score) => (
            <Box
              key={score}
              label={score}
              selected={value === Number(score)}
              onPress={() => onChange(allowNone && value === Number(score) ? null : Number(score))}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

/** Several boxes may be chosen, up to `max`; the rest go quiet once it is reached. */
export function MultiChoices({
  label,
  hint,
  groups,
  selected,
  onToggle,
  max,
}: {
  label: string;
  hint?: string;
  groups: readonly { label: string; options: readonly { value: string; label: string }[] }[];
  selected: ReadonlySet<string>;
  onToggle: (value: string) => void;
  max: number;
}) {
  const full = selected.size >= max;
  return (
    <View style={{ gap: 10 }} accessibilityLabel={label}>
      <Label>{label}</Label>
      {hint ? <Mono muted>{hint}</Mono> : null}
      {groups.map((group) => (
        <View key={group.label} style={{ gap: 6 }}>
          <Mono muted style={{ fontSize: 11 }}>
            {group.label}
          </Mono>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {group.options.map((option) => {
              const on = selected.has(option.value);
              return (
                <Box
                  key={option.value}
                  grow={false}
                  label={option.label}
                  selected={on}
                  disabled={!on && full}
                  onPress={() => onToggle(option.value)}
                />
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
}

/** Today, yesterday, or another day from the system picker (never a day in the future). */
export function DayPicker({
  label,
  value,
  onChange,
  today,
}: {
  label: string;
  value: string;
  onChange: (day: string) => void;
  today: string;
}) {
  const [picking, setPicking] = useState(false);
  const yesterday = daysBefore(today, 1);
  const other = value !== today && value !== yesterday;
  const asDate = new Date(`${value}T12:00:00Z`);
  const pick = (date: Date | undefined) => {
    setPicking(false);
    if (date) onChange(date.toISOString().slice(0, 10));
  };

  return (
    <View style={{ gap: 8 }}>
      <Label>{label}</Label>
      <View style={{ flexDirection: "row", gap: 6 }}>
        <Box
          label={t.mobile.add.today}
          selected={value === today}
          onPress={() => onChange(today)}
        />
        <Box
          label={t.mobile.add.yesterday}
          selected={value === yesterday}
          onPress={() => onChange(yesterday)}
        />
        <Box
          label={other ? value.split("-").reverse().join(".") : t.mobile.add.otherDay}
          selected={other}
          onPress={() => {
            if (Platform.OS === "android") {
              DateTimePickerAndroid.open({
                value: asDate,
                mode: "date",
                maximumDate: new Date(`${today}T12:00:00Z`),
                onChange: (_event, date) => pick(date),
              });
            } else {
              setPicking((open) => !open);
            }
          }}
        />
      </View>
      {Platform.OS === "ios" && picking ? (
        <DateTimePicker
          value={asDate}
          mode="date"
          display="inline"
          locale="tr-TR"
          maximumDate={new Date(`${today}T12:00:00Z`)}
          onChange={(_event, date) => pick(date)}
        />
      ) : null}
    </View>
  );
}

/** A numbered part of a form, as on the website. */
export function Part({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View>
      <SectionHeading index={index}>{title}</SectionHeading>
      <View style={{ gap: 18, paddingTop: 14 }}>{children}</View>
    </View>
  );
}

/** What most entries leave out, folded away until asked for. */
export function Details({
  index,
  title,
  open: startOpen = false,
  children,
}: {
  index: number;
  title: string;
  open?: boolean;
  children: React.ReactNode;
}) {
  const colors = useColors();
  const [open, setOpen] = useState(startOpen);
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={{
          marginTop: 24,
          paddingBottom: 6,
          borderBottomWidth: 1,
          borderColor: colors.foreground,
        }}
      >
        <Text
          style={{
            fontFamily: fonts.mono,
            fontSize: 12,
            letterSpacing: 0.6,
            color: colors.foreground,
          }}
        >
          {String(index).padStart(2, "0")} — {title.toLocaleUpperCase("tr")} {open ? "▴" : "▾"}
        </Text>
      </Pressable>
      {open ? <View style={{ gap: 18, paddingTop: 14 }}>{children}</View> : null}
    </View>
  );
}
