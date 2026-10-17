import { createNativeBottomTabNavigator } from "@react-navigation/bottom-tabs/unstable";
import { DarkTheme, DefaultTheme, NavigationContainer, type Theme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar, useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { ArchiveProvider } from "@/lib/archive";
import { t } from "@/lib/i18n";
import { NotificationsProvider, useNotifications } from "@/lib/notifications";
import { SessionProvider } from "@/lib/session";
import { fonts, useColors } from "@/lib/theme";
import { navigationRef, type RootStackParamList, type TabParamList } from "@/navigation";
import AccountScreen from "@/screens/account";
import AddScreen from "@/screens/add";
import CafeScreen from "@/screens/cafe";
import CafesScreen from "@/screens/cafes";
import CoffeeScreen from "@/screens/coffee";
import CoffeesScreen from "@/screens/coffees";
import FeedScreen from "@/screens/feed";
import ListScreen from "@/screens/list";
import NewTastingScreen from "@/screens/new-tasting";
import NewVisitScreen from "@/screens/new-visit";
import NotificationsScreen from "@/screens/notifications";
import ProfileScreen from "@/screens/profile";
import SignInScreen from "@/screens/sign-in";
import SuggestionsScreen from "@/screens/suggestions";
import TastingScreen from "@/screens/tasting";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createNativeBottomTabNavigator<TabParamList>();

/**
 * The tab bar is iOS's own (UITabBarController): on iOS 26 and later that is the rounded,
 * translucent "Liquid Glass" bar, which shrinks while a list scrolls down. Icons are SF
 * Symbols, filled when selected; the account tab carries the unread notifications.
 */
function Tabs() {
  const colors = useColors();
  const { unread, refreshUnread } = useNotifications();
  return (
    <Tab.Navigator
      // A tab coming into view (also on the way back from a page) counts the unread again.
      screenListeners={{ focus: () => void refreshUnread() }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarLabelStyle: { fontFamily: fonts.mono, fontSize: 10 },
        tabBarMinimizeBehavior: "onScrollDown",
      }}
    >
      <Tab.Screen
        name="Feed"
        component={FeedScreen}
        options={{
          title: t.mobile.tabs.feed,
          tabBarIcon: ({ focused }) => ({
            type: "sfSymbol",
            name: focused ? "newspaper.fill" : "newspaper",
          }),
        }}
      />
      <Tab.Screen
        name="Coffees"
        component={CoffeesScreen}
        options={{
          title: t.mobile.tabs.coffees,
          tabBarIcon: ({ focused }) => ({
            type: "sfSymbol",
            name: focused ? "cup.and.saucer.fill" : "cup.and.saucer",
          }),
        }}
      />
      <Tab.Screen
        name="Cafes"
        component={CafesScreen}
        options={{
          title: t.mobile.tabs.cafes,
          tabBarIcon: ({ focused }) => ({
            type: "sfSymbol",
            name: focused ? "storefront.fill" : "storefront",
          }),
        }}
      />
      <Tab.Screen
        name="Add"
        component={AddScreen}
        options={{
          title: t.mobile.add.tab,
          tabBarIcon: ({ focused }) => ({
            type: "sfSymbol",
            name: focused ? "plus.circle.fill" : "plus.circle",
          }),
        }}
      />
      <Tab.Screen
        name="Account"
        component={AccountScreen}
        options={{
          title: t.mobile.tabs.account,
          tabBarIcon: ({ focused }) => ({
            type: "sfSymbol",
            name: focused ? "person.fill" : "person",
          }),
          tabBarBadge: unread > 0 ? unread : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.brand, color: colors.brandForeground },
        }}
      />
    </Tab.Navigator>
  );
}

function Screens() {
  const colors = useColors();
  const dark = useColorScheme() === "dark";
  const base = dark ? DarkTheme : DefaultTheme;
  const theme: Theme = {
    ...base,
    colors: {
      ...base.colors,
      primary: colors.brand,
      background: colors.background,
      card: colors.background,
      text: colors.foreground,
      border: colors.border,
      notification: colors.brand,
    },
  };

  return (
    <NavigationContainer ref={navigationRef} theme={theme}>
      <StatusBar barStyle={dark ? "light-content" : "dark-content"} />
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          headerTitleStyle: { fontFamily: fonts.mono, fontSize: 13 },
          headerShadowVisible: false,
          headerBackTitle: t.mobile.back,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="Coffee" component={CoffeeScreen} options={{ title: t.nav.coffees }} />
        <Stack.Screen name="Cafe" component={CafeScreen} options={{ title: t.cafes.title }} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="List" component={ListScreen} options={{ title: t.lists.kicker }} />
        <Stack.Screen
          name="Tasting"
          component={TastingScreen}
          options={{ title: t.tastingPage.kicker }}
        />
        <Stack.Screen name="Suggestions" component={SuggestionsScreen} options={{ title: "" }} />
        <Stack.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{ title: t.notifications.title }}
        />
        <Stack.Group screenOptions={{ presentation: "modal" }}>
          <Stack.Screen
            name="SignIn"
            component={SignInScreen}
            options={{ title: t.mobile.signInTitle }}
          />
          <Stack.Screen
            name="NewTasting"
            component={NewTastingScreen}
            options={{ title: t.mobile.add.newCoffeeTitle }}
          />
          <Stack.Screen
            name="NewVisit"
            component={NewVisitScreen}
            options={{ title: t.mobile.add.newVisitTitle }}
          />
        </Stack.Group>
      </Stack.Navigator>
    </NavigationContainer>
  );
}

/** The app: who is signed in, the archive, the unread count, and the screens. */
export default function App() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <ArchiveProvider>
          <NotificationsProvider>
            <Screens />
          </NotificationsProvider>
        </ArchiveProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
