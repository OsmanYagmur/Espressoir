import { router, type Route } from "@/navigation";
import { Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Body, Heading, Mono } from "@/components/ui";
import { t } from "@/lib/i18n";
import { fonts, useColors } from "@/lib/theme";

const a = t.mobile.add;

/** One of the two things to add: a ruled block, the whole of it a button. */
function Choice({ title, hint, to }: { title: string; hint: string; to: Route }) {
  const colors = useColors();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={hint}
      onPress={() => router.push(to)}
      style={({ pressed }) => ({
        borderWidth: 1.5,
        borderColor: colors.foreground,
        padding: 18,
        gap: 6,
        backgroundColor: pressed ? colors.muted : "transparent",
      })}
    >
      <Body style={{ fontFamily: fonts.bodyBold, fontSize: 20 }}>{title}</Body>
      <Mono muted>{hint}</Mono>
    </Pressable>
  );
}

/** "What did you drink?": a tasting of a coffee, or a drink at a café. */
export default function AddScreen() {
  const colors = useColors();
  return (
    <SafeAreaView edges={["top"]} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ padding: 18, gap: 16 }}>
        <Heading>{a.title}</Heading>
        <Body muted>{a.lead}</Body>
        <View style={{ gap: 12 }}>
          <Choice title={a.tasting} hint={a.tastingHint} to={{ screen: "NewTasting" }} />
          <Choice title={a.visit} hint={a.visitHint} to={{ screen: "NewVisit" }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
