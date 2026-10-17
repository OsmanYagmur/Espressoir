// The iOS 27 SDK refuses to launch an app that has not adopted the scene life cycle (the app
// starts and closes at once; the crash report names `NoSceneLifecycleAdoption`). Expo 57 ships the
// scene delegate (`ExpoAppSceneDelegate`) but its prebuild template still uses the old app-delegate
// start, so this plugin switches the generated project over on every `expo prebuild`:
//  - Info.plist declares one window scene handled by Expo's delegate;
//  - AppDelegate provides the React Native factory and leaves creating the window to the scene.
// When Expo's template adopts scenes itself, the edits below stop matching and prebuild fails
// loudly: then remove this plugin.
const { withAppDelegate, withInfoPlist } = require("expo/config-plugins");

const SCENE_DELEGATE = "EXExpoAppSceneDelegate"; // @objc name of ExpoAppSceneDelegate

function replaceOnce(source, search, replacement, what) {
  if (!source.includes(search)) {
    throw new Error(`with-scene-lifecycle: ${what} not found in AppDelegate.swift`);
  }
  return source.replace(search, replacement);
}

const withSceneManifest = (config) =>
  withInfoPlist(config, (plist) => {
    plist.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: "Default Configuration",
            UISceneDelegateClassName: SCENE_DELEGATE,
          },
        ],
      },
    };
    return plist;
  });

const withSceneAppDelegate = (config) =>
  withAppDelegate(config, (delegate) => {
    if (delegate.modResults.language !== "swift") {
      throw new Error("with-scene-lifecycle: expected a Swift AppDelegate");
    }
    let source = delegate.modResults.contents;
    if (source.includes("ExpoReactNativeFactoryProvider")) return delegate;
    source = replaceOnce(
      source,
      "class AppDelegate: ExpoAppDelegate {",
      "class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {",
      "the AppDelegate class line",
    );
    // The scene delegate creates the window and starts React Native into it.
    source = source.replace(
      /\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?\n#endif\n/,
      "\n    // The window is created by the scene delegate (ExpoAppSceneDelegate).\n",
    );
    if (source.includes("UIWindow(frame: UIScreen.main.bounds)")) {
      throw new Error("with-scene-lifecycle: could not remove the app-delegate window start");
    }
    delegate.modResults.contents = source;
    return delegate;
  });

module.exports = (config) => withSceneAppDelegate(withSceneManifest(config));
