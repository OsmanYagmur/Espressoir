/**
 * The app's screens and how to reach them (React Navigation). Screens move with `router` —
 * push, replace, back — from anywhere, typed by `RootStackParamList`; a screen reads its own
 * parameters with `useParams`.
 */
import {
  StackActions,
  createNavigationContainerRef,
  useNavigation,
  useRoute,
  type NavigatorScreenParams,
  type RouteProp,
} from "@react-navigation/native";
import { useLayoutEffect } from "react";

/** The tabs along the bottom. */
export type TabParamList = {
  Feed: undefined;
  Coffees: undefined;
  Cafes: undefined;
  Add: undefined;
  Account: undefined;
};

/** Every screen above the tabs, with what it needs to show. */
export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList> | undefined;
  Coffee: { marka: string; kahve: string };
  Cafe: { sehir: string; kafe: string };
  Profile: { username: string };
  List: { username: string; slug: string };
  Tasting: { id: string };
  NewTasting: { kahve?: string } | undefined;
  NewVisit: { kafe?: string } | undefined;
  SignIn: undefined;
  Notifications: undefined;
  Suggestions: undefined;
};

export type ScreenName = keyof RootStackParamList;

/** A place in the app: a screen and its parameters (required where the screen needs them). */
export type Route = {
  [S in ScreenName]: undefined extends RootStackParamList[S]
    ? { screen: S; params?: RootStackParamList[S] }
    : { screen: S; params: RootStackParamList[S] };
}[ScreenName];

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/** Moves between screens from anywhere: a tab's content, a component, a callback. */
export const router = {
  push(to: Route) {
    if (navigationRef.isReady()) navigationRef.dispatch(StackActions.push(to.screen, to.params));
  },
  replace(to: Route) {
    if (navigationRef.isReady()) {
      navigationRef.dispatch(StackActions.replace(to.screen, to.params));
    }
  },
  back() {
    if (navigationRef.isReady() && navigationRef.canGoBack()) navigationRef.goBack();
  },
};

/** The parameters the current screen was opened with. */
export function useParams<S extends ScreenName>(): RootStackParamList[S] {
  // A screen whose parameters are required is only ever opened with them (`Route`).
  return useRoute<RouteProp<RootStackParamList, S>>().params as RootStackParamList[S];
}

/** Sets the header title of the current screen (for titles known only once data is in). */
export function useScreenTitle(title: string): void {
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);
}
