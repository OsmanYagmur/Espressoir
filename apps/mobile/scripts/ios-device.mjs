// Builds the app in Release (the JavaScript inside, no computer needed afterwards), installs it
// on the iPhone connected by cable and opens it. Signing: the free Apple ID in Xcode
// (DEVELOPMENT_TEAM in the project); such an install opens for 7 days, then run this again.
//
//   pnpm --filter @espressoir/mobile ios:device            first connected iPhone
//   pnpm --filter @espressoir/mobile ios:device "Osman"    the one whose name contains this
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ios = join(root, "ios");
// Outside the project folder: build products do not belong in an iCloud-synced Desktop.
const derivedData = join(homedir(), "Library/Developer/Xcode/DerivedData/Espressoir-device");
const run = (command, args, options = {}) =>
  execFileSync(command, args, { stdio: "inherit", cwd: root, ...options });

run("node", ["scripts/write-env.mjs"]);

// 1. The iPhone.
const listing = join(mkdtempSync(join(tmpdir(), "devices-")), "devices.json");
execFileSync("xcrun", ["devicectl", "list", "devices", "--json-output", listing], {
  stdio: "ignore",
});
const wanted = (process.argv[2] ?? "").toLowerCase();
const phones = JSON.parse(readFileSync(listing, "utf8")).result.devices.filter(
  (device) =>
    device.hardwareProperties?.reality === "physical" &&
    device.hardwareProperties?.platform === "iOS" &&
    device.connectionProperties?.pairingState === "paired" &&
    // "unavailable": unplugged, or locked since it was plugged in.
    device.connectionProperties?.tunnelState !== "unavailable" &&
    (device.deviceProperties?.name ?? "").toLowerCase().includes(wanted),
);
const phone = phones[0];
if (!phone) {
  console.error(
    "Bağlı bir iPhone bulunamadı. Kabloyla bağla, kilidini aç ve “Bu bilgisayara güven”i onayla.",
  );
  process.exit(1);
}
const udid = phone.hardwareProperties.udid;
console.log(`iPhone: ${phone.deviceProperties.name} (${udid})`);

// 2. Native dependencies, when the Podfile changed since the last install.
const lock = join(ios, "Podfile.lock");
const manifest = join(ios, "Pods/Manifest.lock");
if (
  !existsSync(manifest) ||
  !existsSync(lock) ||
  readFileSync(lock, "utf8") !== readFileSync(manifest, "utf8")
) {
  run("pod", ["install"], { cwd: ios });
}

// 3. Build, install, open.
run(
  "xcodebuild",
  [
    "-workspace",
    "Espressoir.xcworkspace",
    "-scheme",
    "Espressoir",
    "-configuration",
    "Release",
    // Any iPhone: the build does not need the phone awake; devicectl installs it afterwards.
    "-destination",
    "generic/platform=iOS",
    "-derivedDataPath",
    derivedData,
    "-allowProvisioningUpdates",
    "-quiet",
    "build",
  ],
  { cwd: ios },
);
const app = join(derivedData, "Build/Products/Release-iphoneos/Espressoir.app");
run("xcrun", ["devicectl", "device", "install", "app", "--device", udid, app]);
try {
  run("xcrun", [
    "devicectl",
    "device",
    "process",
    "launch",
    "--device",
    udid,
    "com.espressoir.app",
  ]);
} catch {
  console.log("Kuruldu. Telefon kilitliyse kilidini açıp Espressoir'i kendin aç.");
}
