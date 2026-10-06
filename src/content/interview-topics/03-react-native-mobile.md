# 03 — React Native, Native Android, iOS & App Store Deployment

> Easy English. Short lines. Say them out loud.
> **Time:** ~6 hours · **Pairs with:** [09 — Real-Time](09-realtime-websockets.md) (sockets on mobile),
> [15 — System Design](15-system-design.md) (offline-first), [14 — DevOps](14-cloud-devops.md) (CI/CD)
> ⭐ **This is your most differentiating skill.** Most React Native developers have never written a Kotlin
> native module, a foreground service, or a system overlay. You have.

---

## How this file is organised — basic → advanced

**Every topic:** explanation → deeper detail → **interview questions** → **scenarios**.

| Level | Topics | Time | You can answer… |
|---|---|---|---|
| **1. React Native basics** | 1 How RN works · 2 **Old vs new architecture** · 3 Navigation, state, styling | 1 h | "How does JavaScript talk to native code?" |
| **2. Native Android** ⭐ | 4 Writing a Kotlin module · 5 **Foreground services** · 6 Overlays, receivers, intents · 7 Permissions | 1.5 h | "Why a foreground service? How did you draw over the dialer?" |
| **3. Doing it well** | 8 Performance & lists · 9 **Offline-first & sync** · 10 Push notifications & deep links · 11 Storage | 1.5 h | "The list is laggy. The phone has no signal." |
| **4. iOS** | 12 iOS basics & the differences · 13 **Your honest iOS position** | 45 min | "How much iOS have you done?" |
| **5. Release** ⭐ | 14 Versioning & signing · 15 **Play Store** · 16 **App Store** · 17 OTA updates · 18 CI/CD & crash reporting | 1.5 h | "Walk me through shipping a release." |
| **Wrap-up** | 19 Your project story · 20 Rapid-fire · 21 Self-check · 22 Traps | 30 min | |

**If you only have 1 hour:** §0, §2, §5, §9, §15, §16, §19.

---

## 0. The 30-second answer (memorise this)

> 💬 **"Tell me about your mobile work."**
>
> "I build with React Native and TypeScript, and I go native when the product needs it.
>
> On the CRM app I wrote **Kotlin native modules** — a foreground service holding a socket for
> click-to-call, a system overlay that shows the matched lead on top of the dialer, call-state
> listeners, and recording upload. That handled 5,000+ call logs and 2,000+ recordings with zero data
> loss, because every event is written to local SQLite **first** and synced after.
>
> The hard parts on Android are not React — they are the OS: background execution limits, OEM battery
> killers, and recording paths that differ per manufacturer.
>
> My iOS experience is smaller — I have built and released React Native apps, but the deep native work
> I did was on Android."

⭐ That last line is the honest version. Say it before they find it.

---
---

# LEVEL 1 — REACT NATIVE BASICS

---

## 1. How React Native actually works

### The simple idea

**React Native is not a web view.** Your JavaScript describes the UI, and RN creates **real native
views** — a real `UIView` on iOS, a real `ViewGroup` on Android.

```
Your React code  →  RN  →  real native widgets on the screen
```

So `<View>` becomes a native view, `<Text>` becomes a native text label, and scrolling feels native
because it *is* native.

| | React Native | Flutter | WebView app (Cordova) |
|---|---|---|---|
| UI | Real native views | Its own drawing engine | A web page in a shell |
| Language | JavaScript / TypeScript | Dart | HTML + JS |
| Feel | Native | Native-like, very consistent | Often noticeably not native |

### The three threads (know these names)

| Thread | Does |
|---|---|
| **JS thread** | Runs your React code, state, business logic |
| **UI / main thread** | Draws the screen, handles touches |
| **Shadow thread** | Calculates layout (Yoga, a flexbox engine) |

⭐ **Why it matters:** if you block the **JS thread** with a heavy loop, animations that live on the UI
thread may still run — but touches stop being handled, lists go blank, and the app feels frozen. Heavy
work must be moved off the JS thread (§8).

### Interview questions

**Q: Is React Native a WebView?**
> "No. It renders real native views — a React Native `View` is a real Android `ViewGroup` or an iOS
> `UIView`. The JavaScript only describes what to render and holds the logic."

**Q: What are the threads in React Native?** → the table, plus the "blocking the JS thread" point.

---

## 2. ⭐ Old architecture vs new architecture

### The old way — the Bridge

```
JS thread  ──[ JSON messages over the BRIDGE ]──►  Native
                    asynchronous · batched · serialised
```

Everything crossed as **JSON strings**, asynchronously and in batches.

**The problems:** it was slow for chatty work (every frame of a gesture), you could never call native
code synchronously, and big payloads (a long list) cost serialisation time.

### The new architecture (default since RN 0.76 — you are on 0.85)

| Piece | What it does |
|---|---|
| **JSI** (JavaScript Interface) | ⭐ Lets JavaScript hold a **direct reference** to a C++/native object and call it **synchronously** — no JSON, no bridge |
| **TurboModules** | Native modules loaded **lazily** (only when first used) and typed |
| **Fabric** | The new renderer — the UI tree lives in C++, so layout and rendering are faster and can be synchronous |
| **Codegen** | Generates the native glue code from your TypeScript spec, so JS and native types cannot drift apart |
| **Hermes** | The JavaScript engine built for RN — fast startup, small memory, bytecode compiled at build time |

**The one-line answer:** "The bridge sent JSON asynchronously between JavaScript and native. JSI removes
it — JavaScript can call native functions directly, TurboModules load lazily, Fabric renders from C++,
and Codegen keeps the types in sync."

### Interview questions

**Q: Explain the old and new React Native architecture.** → the diagram + the table + the one-line answer.

**Q: What is Hermes?**
> "The JavaScript engine made for React Native. It compiles to bytecode at build time, so apps start
> faster and use less memory. It is the default now."

**Q: What is Codegen for?**
> "It generates the native binding code from a TypeScript spec for the module. That way the JavaScript
> signature and the native implementation cannot get out of sync — a mismatch becomes a build error
> instead of a crash."

---

## 3. Navigation, state and styling

### Navigation (React Navigation)

| Navigator | Use |
|---|---|
| **Stack** | Push and pop screens — the normal flow |
| **Tabs** | Bottom tabs |
| **Drawer** | Side menu |
| **Nested** | A stack inside a tab — very common |

**Deep linking** maps a URL to a screen: `clinic://appointments/55` or `https://app.goclinic.online/…`
(§10).

### State

| Need | Tool |
|---|---|
| One screen's state | `useState` / `useReducer` |
| Shared app state | Redux Toolkit, Zustand, Context (small things only) |
| **Server data** ⭐ | **RTK Query** or React Query — caching, refetch, loading and error states |

⭐ **The distinction to say:** "Server data is not really state — it is a cache of someone else's data.
Treating it as cache, with RTK Query, removed most of my Redux boilerplate and gave me refetching and
invalidation for free."

### Styling and layout

- `StyleSheet.create`, flexbox (default direction is **column**, unlike the web).
- Sizes are **density-independent pixels**, not CSS pixels; no `px` units.
- `Dimensions` / `useWindowDimensions` for screen size, `Platform.OS` / `Platform.select` for
  per-platform code, `SafeAreaView` for notches.

### Interview questions

**Q: How do you handle server data in a React Native app?** → the RTK Query answer above.

**Q: How is styling different from the web?**
> "Flexbox by default with `column` direction, no CSS files or cascade, no `px` units, and a limited
> subset of properties — no floats, no grid. Anything shared is a style object, not a class name."

---
---

# LEVEL 2 — NATIVE ANDROID ⭐

> This is the part that makes you stand out. Be able to explain **why** each piece was necessary.

---

## 4. Writing a native module in Kotlin

### When you need one

When the feature is not in React Native or any library: call state, system overlays, a foreground
service, OEM-specific file access, an SDK that is native-only.

```kotlin
class CallModule(private val ctx: ReactApplicationContext) : ReactContextBaseJavaModule(ctx) {

  override fun getName() = "CallModule"                    // the name JS imports

  @ReactMethod
  fun placeCall(number: String, promise: Promise) {        // ⭐ Promise → async/await in JS
    try {
      val intent = Intent(Intent.ACTION_CALL, Uri.parse("tel:$number"))
      intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      ctx.startActivity(intent)
      promise.resolve(true)
    } catch (e: Exception) {
      promise.reject("CALL_FAILED", e)                     // becomes a JS error
    }
  }

  // native → JS events (call state changed, recording ready)
  fun sendEvent(name: String, params: WritableMap) {
    ctx.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
       .emit(name, params)
  }
}
```
```ts
// JavaScript side
import { NativeModules, NativeEventEmitter } from 'react-native';
const { CallModule } = NativeModules;

await CallModule.placeCall('+919876500001');

const emitter = new NativeEventEmitter(NativeModules.CallStateModule);
const sub = emitter.addListener('callStateChanged', (e) => setState(e.state));
// ⭐ remove it on unmount or you leak listeners
return () => sub.remove();
```

**The three ways data crosses:**
1. **Promise** — JS calls native, waits for a result.
2. **Callback** — older style, single use.
3. **Event emitter** ⭐ — native pushes to JS whenever something happens (a call started, a file appeared).

⚠️ Only simple types cross: strings, numbers, booleans, maps, arrays. No class instances.
⚠️ A module must be registered in a **package** and added to `MainApplication`.

### Interview questions

**Q: How do you write a native module?** → the Kotlin skeleton, `@ReactMethod`, promise vs event emitter,
and registering the package.

**Q: How does native code send data to JavaScript?**
> "Through the device event emitter. Native emits a named event with a payload map, and JavaScript
> subscribes with `NativeEventEmitter`. I always remove the subscription on unmount — leaked listeners
> are a common bug."

---

## 5. ⭐ Foreground services (the answer they remember)

### The problem

Android kills background work. Since Android 8, a plain background service is stopped soon after the app
leaves the screen, and Doze mode plus OEM battery managers make it worse.

But the CRM app must keep a **socket open** so an agent can receive a click-to-call instruction at any
time, and must capture call state even when the app is not on screen.

### The answer

A **foreground service**: it shows a permanent notification, so the user knows it is running, and Android
treats it as important.

```kotlin
class SocketService : Service() {
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    startForeground(NOTIF_ID, buildNotification())      // ⭐ MUST be called within ~5 seconds
    connectSocket()
    return START_STICKY                                 // restart if the system kills it
  }
}
```
```xml
<!-- AndroidManifest.xml -->
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />   <!-- Android 13+ -->
<service android:name=".SocketService" android:foregroundServiceType="dataSync" />  <!-- Android 14 -->
```

**Details that prove you did it:**
- `startForeground` **within 5 seconds** or the app crashes with `ForegroundServiceDidNotStartInTime`.
- **Android 13+** needs runtime permission for notifications.
- **Android 14** requires a declared `foregroundServiceType` and a matching permission.
- **Doze and OEM killers** (Xiaomi, Oppo, Vivo) still stop services — you must ask the user to disable
  battery optimisation for the app, and handle restarts.

> 💬 **Why not a background service?** "Since Android 8, background services are killed shortly after the
> app leaves the foreground, and background execution limits apply. The agent has to receive a call
> instruction at any moment, so it must be a foreground service with a persistent notification — that is
> the contract Android offers: be visible, and you may keep running."

### Interview questions

**Q: Why a foreground service instead of a background one?** → the quote.

**Q: What breaks on Xiaomi and Oppo devices?**
> "Aggressive battery managers kill services even when Android's own rules allow them. I detect it,
> guide the user to the battery-optimisation settings during onboarding, make the service restartable
> with `START_STICKY`, and design the sync so a killed service loses nothing — the data is already in
> local SQLite."

---

## 6. Overlays, broadcast receivers and intents

### System overlay — drawing on top of the dialer

```kotlin
val params = WindowManager.LayoutParams(
  WRAP_CONTENT, WRAP_CONTENT,
  WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,     // API 26+
  WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE,          // ⭐ so the dialer still works
  PixelFormat.TRANSLUCENT,
)
windowManager.addView(overlayView, params)
// on call end:
windowManager.removeView(overlayView)                      // ⭐ leaked overlays are a real bug class
```

**Permission:** `SYSTEM_ALERT_WINDOW` is **not** a normal dialog permission — the user must enable it on
a settings screen. Send them there with `Settings.ACTION_MANAGE_OVERLAY_PERMISSION` and check
`Settings.canDrawOverlays(context)`. ⭐ This needs an onboarding flow, which is a nice product detail to
mention.

### Broadcast receivers — reacting to system events

```kotlin
class CallReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val state = intent.getStringExtra(TelephonyManager.EXTRA_STATE)   // RINGING / OFFHOOK / IDLE
    // send to JS, and write the event locally first
  }
}
```
Modern Android prefers `TelephonyCallback` (API 31+) over some older broadcasts, and most implicit
broadcasts must now be registered **at runtime**, not in the manifest.

### Intents — asking the OS to do something

```kotlin
Intent(Intent.ACTION_CALL, Uri.parse("tel:$number"))   // places the call (needs CALL_PHONE)
Intent(Intent.ACTION_DIAL, Uri.parse("tel:$number"))   // opens the dialer (no permission)
```

### Interview questions

**Q: How did you show information over the dialer?** → overlay permission flow + `TYPE_APPLICATION_OVERLAY`
+ `FLAG_NOT_FOCUSABLE` + removing the view on call end.

**Q: What is a broadcast receiver?**
> "A component that listens for system or app events — call state, connectivity, boot completed. Newer
> Android versions restrict implicit broadcasts, so I register at runtime and prefer the modern
> telephony callbacks."

---

## 7. Permissions — the part that bites in review

| Permission | Note |
|---|---|
| `CALL_PHONE` | Placing a call directly |
| `READ_PHONE_STATE` | Call state |
| `READ_CALL_LOG` ⚠️ | **Sensitive** — Play Store requires a declaration form and an approved use case |
| `RECORD_AUDIO` / recordings | Very sensitive; call recording rules changed and are restricted |
| `SYSTEM_ALERT_WINDOW` | Settings-screen grant, not a dialog |
| `POST_NOTIFICATIONS` | Runtime permission on Android 13+ |
| Storage | Scoped storage since Android 10 — no free access to the whole file system |

**Runtime pattern:** ask **in context** ("we need this to log your calls"), handle "deny", and handle
"deny and don't ask again" by sending the user to settings.

⭐ **Say this:** "Call log and recording permissions need a Play Store declaration with a justified use
case, and a privacy policy. That is a release blocker, not a coding detail — I planned for it."

### Scenarios

**S1. Call recordings work on your Samsung test phone, but not on Xiaomi or OnePlus.**
> "Recording file paths and naming differ per manufacturer and per Android version, and some OEMs do not
> expose recordings at all.
> What I did: resolve the newest file by scanning known directories per OEM, match it to the call by
> timestamp and duration, and treat 'no recording found' as a normal outcome rather than an error — the
> call log is still captured.
> And I say the honest version: I handled the common OEMs, I did not solve it universally."

---
---

# LEVEL 3 — DOING IT WELL

---

## 8. Performance

### Lists — where most lag lives

```tsx
<FlatList
  data={calls}
  keyExtractor={(item) => item.id}                 // ⭐ stable id, never the index
  renderItem={({ item }) => <CallRow call={item} />}
  initialNumToRender={10}
  windowSize={5}                                    // how many screens to keep rendered
  removeClippedSubviews
  getItemLayout={(_, i) => ({ length: ROW_H, offset: ROW_H * i, index: i })}   // ⭐ fixed heights
  onEndReachedThreshold={0.5}
  onEndReached={loadMore}
/>
```

| Lever | Why |
|---|---|
| **`FlatList`, never `.map()` in a ScrollView** | A ScrollView renders **everything**; FlatList recycles |
| **`keyExtractor` with a real id** | Index keys break reordering and cause re-renders |
| **`getItemLayout`** | Skips measuring — instant scrolling and working `scrollToIndex` |
| **`React.memo` on the row** | Stops re-rendering 200 rows when one changes |
| **`useCallback` for `renderItem`** | A new function every render defeats `memo` |
| **FlashList** (Shopify) | A faster drop-in replacement for long lists |

### Other levers

| Problem | Fix |
|---|---|
| Heavy work on the JS thread | Move it native, or chunk it with `InteractionManager` |
| Animations stuttering | **Reanimated** — runs on the UI thread, not the JS thread |
| Big images | Resize on the server, cache (`expo-image` / FastImage), correct `resizeMode` |
| Slow startup | Hermes, lazy screens, defer non-critical work until after the first paint |
| Too many re-renders | `memo`, stable callbacks, selectors, and splitting context |
| Bundle size | Check with a bundle visualiser; remove unused libraries |

**Measuring:** Flipper or the React DevTools profiler, and the RN performance monitor for **JS FPS vs UI
FPS** — that split tells you immediately which thread is the problem.

### Interview questions

**Q: A long list is laggy. What do you check?** → FlatList props (`keyExtractor`, `getItemLayout`,
`windowSize`), `React.memo` on rows, heavy work in `renderItem`, and image sizes. "First I check which
FPS drops — JS or UI — because that tells me which thread to fix."

**Q: Why does Reanimated feel smoother?**
> "It runs the animation on the UI thread, so a busy JavaScript thread does not stutter it. The old
> Animated API without `useNativeDriver` had to cross to JS each frame."

### Scenarios

**S2. The call list stutters after 500 rows and the app freezes for a second when data arrives.**
> "Two separate problems. The stutter is list rendering — I check `FlatList` is used with a stable key,
> `getItemLayout` for fixed-height rows, `windowSize` tuned, and the row wrapped in `React.memo` with a
> stable `renderItem`.
> The freeze on data arrival is JS-thread work — parsing and sorting a big payload. I move it off the
> critical path: paginate the API, sort on the server, and process in chunks. The performance monitor
> tells me which thread dropped frames."

---

## 9. ⭐⭐ Offline-first and sync (your zero-data-loss story)

### The rule

**Write locally first. Sync later.** The network is never assumed.

```
User acts → write to LOCAL SQLite immediately (synced = false)
          → UI updates from local data (instant, works offline)
          → background queue uploads when there is connectivity
          → server confirms → mark synced = true
```

⭐ **Why this matters in your CRM:** 5,000+ call logs and 2,000+ recordings with **zero data loss**, on
phones that are constantly in and out of signal.

### The details that make it work

| Detail | Why |
|---|---|
| **Client-generated ID** (UUID) ⭐ | The server deduplicates retries — the same upload twice creates one row |
| **`synced` flag + `attempts` column** | You can always see what is pending and what keeps failing |
| **Retry with backoff** | Bad networks fail often; do not hammer |
| **Resumable/multipart upload** for recordings | A 20 MB file on 3G will be interrupted |
| **Sync on reconnect** | Listen to connectivity, then drain the queue |
| **Server time for ordering** | Phone clocks are wrong; do not order by device time |
| **Append-only where possible** | Call logs never change, so there are **no conflicts at all** ⭐ |

### Conflict resolution — know what you chose and why

| Strategy | Meaning |
|---|---|
| **Last write wins** | Simple; can silently lose an edit |
| **Server wins** | Safe for data the server owns |
| **Field-level merge** | Better, more work |
| **Append-only** ⭐ | No conflicts by design — the right answer for events and logs |

**Storage choices:** SQLite (`react-native-sqlite-storage`, `op-sqlite`), **WatermelonDB** (built for
offline-first with sync), MMKV for fast key–value, AsyncStorage for small settings only.

### Interview questions

**Q: How do you build offline-first?** → the flow + the details table. Lead with "write locally first".

**Q: How do you avoid duplicate records when a retry succeeds twice?**
> "The client generates the ID, so the server can make the insert idempotent — an upsert on that ID. The
> phone can retry as often as it likes and the result is the same."

### Scenarios

**S3. Field agents report that some calls are missing from the dashboard.**
> "First I check whether the data is missing **on the phone** or only on the server. If it is on the
> phone with `synced = false`, sync is the problem — connectivity, a failing upload, or the service
> being killed; I look at the attempts column and the error.
> If it never reached the phone's database, the capture path failed — the receiver was not registered,
> or the service was killed before writing. That is why the write happens first, before any network
> call: capture and sync are separate problems, and only the second one is allowed to fail."

---

## 10. Push notifications and deep links

### Push

| Platform | Service |
|---|---|
| Android | **FCM** (Firebase Cloud Messaging) |
| iOS | **APNs** — FCM can forward to it |

```
Your server → FCM/APNs → device → app shows the notification
```

**Points to say:**
- **Token per device**, stored server-side, refreshed on app start, and **removed on logout** — otherwise
  the next user gets the previous user's notifications.
- **Data-only vs notification messages:** a notification message is displayed by the OS even when the app
  is closed; a data message wakes your handler.
- **Android 13+** needs `POST_NOTIFICATIONS` at runtime; **iOS** always asks.
- **Delivery is not guaranteed** — treat push as a nudge, and fetch the truth from the API when the app
  opens ([09 §9](09-realtime-websockets.md)).
- ⭐ For anything that must arrive when the app is closed, **push, not a socket**.

### Deep links

```
clinic://appointments/55                     (custom scheme)
https://app.goclinic.online/appointments/55  (universal / app link — verified domain)
```
App Links (Android) and Universal Links (iOS) need a file on your domain
(`assetlinks.json` / `apple-app-site-association`) so the OS trusts the app with those URLs.
Handle both **cold start** (the app was closed) and **warm** (already open) cases, and make sure the link
still works when the user is logged out — save it, log in, then continue.

### Interview questions

**Q: Sockets or push notifications?**
> "A socket keeps the screen live while the app is open. Anything that must reach the user when the app
> is closed goes through push, because the OS suspends sockets in the background."

**Q: What breaks with deep links?**
> "Cold start versus warm start, and the logged-out case. I store the pending link, finish authentication,
> then navigate — otherwise the user lands on a login screen and loses the link."

---

## 11. Storage and security on the device

| Store | Use |
|---|---|
| **AsyncStorage / MMKV** | Small settings, flags. **Not secret.** |
| **SQLite / WatermelonDB** | Real offline data |
| **Keychain (iOS) / Keystore (Android)** ⭐ | Tokens and anything secret — `react-native-keychain` |
| **File system** | Recordings, images, cached documents |

**Mobile security basics to name:**
- Refresh tokens in **secure storage**, never AsyncStorage.
- **No secrets in the app bundle** — anyone can unzip an APK. API keys for third parties belong on your
  server.
- **HTTPS only**; certificate pinning for high-risk apps.
- Biometric unlock for sensitive screens; auto-logout on background for health data.
- Obfuscation (ProGuard/R8) raises the effort, but it is not real security.

### Interview questions

**Q: Where do you store the auth token on mobile?**
> "In the Keychain on iOS or the Keystore on Android through `react-native-keychain`, never AsyncStorage
> — that is plain text on a rooted device. Short-lived access token in memory, refresh token in secure
> storage."

---
---

# LEVEL 4 — iOS

---

## 12. iOS basics and how it differs from Android

### The pieces

| Thing | Android | iOS |
|---|---|---|
| Language | Kotlin / Java | **Swift** / Objective-C |
| Build system | Gradle | **Xcode**, CocoaPods (`pod install`) |
| Simulator | Emulator (works on any OS) | Simulator — ⚠️ **macOS only** |
| App package | APK / **AAB** | **IPA** |
| Store | Google Play Console | App Store Connect |
| Permissions | Manifest + runtime dialogs | `Info.plist` **usage strings** + runtime dialogs |

### A native module in Swift — the same idea

```swift
@objc(CallModule)
class CallModule: NSObject {
  @objc func placeCall(_ number: String,
                       resolver resolve: @escaping RCTPromiseResolveBlock,
                       rejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let url = URL(string: "tel://\(number)") else {
      return reject("BAD_NUMBER", "Invalid number", nil)
    }
    DispatchQueue.main.async { UIApplication.shared.open(url) }   // UI work on the main thread
    resolve(true)
  }

  @objc static func requiresMainQueueSetup() -> Bool { return false }
}
```

### ⭐ The big differences that matter in interviews

| Topic | Android | iOS |
|---|---|---|
| **Background work** | Foreground service can run indefinitely | ⚠️ **Much stricter** — short background tasks, background modes only for specific cases (audio, location, VoIP) |
| **Overlays over other apps** | `SYSTEM_ALERT_WINDOW` | ❌ **Not possible** — apps cannot draw over other apps |
| **Call state & call logs** | Available with permissions | ❌ Not available; **CallKit** integrates *your* calls, it does not read the dialer |
| **Call recording** | OEM-dependent | ❌ Not allowed |
| **File system access** | Scoped but broader | Sandboxed per app |
| **Review process** | Usually hours, automated | ⚠️ **Human review**, stricter, can reject on policy |
| **Permission strings** | Dialog text is generic | Must write a clear reason in `Info.plist`, or it is rejected |

⭐ **This is a great thing to say:** "The CRM's core feature — reading call state and recordings, and
drawing over the dialer — is **only possible on Android**. iOS does not allow it. So the product was
Android-first by platform constraint, not by preference."

### Interview questions

**Q: Could you build the same call-tracking app on iOS?**
> "Not the same way. iOS does not expose call logs or the dialer, does not allow recording the phone
> call, and does not allow drawing over other apps. The closest is CallKit for VoIP calls made inside
> your own app. So on iOS the product would have to change shape — in-app calling rather than tracking
> the native dialer."

**Q: What are the main differences when developing for iOS?** → the table. Lead with background
restrictions and the review process.

---

## 13. ⭐ Your honest iOS position

Say it plainly, then show what you **do** know.

> 💬 **"How much iOS have you done?"**
>
> "My deep native work is Android — Kotlin modules, foreground services, overlays, call state.
>
> On iOS I have worked on React Native apps: building in Xcode, CocoaPods, `Info.plist` permission
> strings, signing with certificates and provisioning profiles, and releasing through TestFlight and App
> Store Connect. I have not written large amounts of Swift.
>
> What I would need time for is deep native iOS work. What I already understand is the platform's rules —
> stricter background execution, no cross-app overlays, no call-log access, and a human review process
> that rejects unclear permission strings."

⭐ That answer is honest **and** demonstrates platform knowledge — much stronger than claiming equal
depth and failing the next question.

---
---

# LEVEL 5 — RELEASE: PLAY STORE & APP STORE ⭐

---

## 14. Versioning and signing

### Two version numbers — know the difference

| Field | Android | iOS | Meaning |
|---|---|---|---|
| **Version name** | `versionName` "2.4.1" | `CFBundleShortVersionString` | What **users** see |
| **Build number** ⭐ | `versionCode` (integer) | `CFBundleVersion` | What the **store** uses. Must **increase every upload**, even for a tiny fix |

⚠️ The most common first-release mistake: uploading a build with a `versionCode` that was already used.
The store rejects it immediately. Automate it in CI (for example from the build number).

### Signing — what actually proves the app is yours

**Android**
- You sign the app with a **keystore** (a `.jks` file + passwords).
- ⭐ **If you lose the keystore, you cannot update your app** — ever. With **Play App Signing** Google
  keeps the real signing key and you keep an upload key, which is the safer modern default.
- Keystore and passwords live in **CI secrets**, never in the repository.

**iOS**
- **Certificate** = proves who the developer is.
- **Provisioning profile** = links the certificate + app ID + allowed devices.
- Two kinds: **development** (test devices) and **distribution** (TestFlight and App Store).
- **Xcode automatic signing** handles most of it; **Fastlane Match** stores them in a private git repo so
  the whole team and CI share one set.
- You need a paid **Apple Developer account** ($99/year). Google Play is a one-time $25.

### Interview questions

**Q: What happens if you lose the Android keystore?**
> "Without Play App Signing, you can never update that app again — you would have to publish a new
> listing and lose all your users and reviews. That is why the keystore goes in a secrets manager with
> backups, and why Play App Signing is the safer default."

**Q: What is a provisioning profile?**
> "An Apple file that ties your signing certificate, the app ID and the allowed devices together. Without
> a matching profile the build will not install or upload."

---

## 15. ⭐ Releasing on Google Play — the full flow

```
1. Build a signed release AAB        ./gradlew bundleRelease   (or EAS build)
2. Upload to Play Console
3. Fill the store listing            title, description, screenshots, icon, feature graphic
4. Complete the declarations         data safety, permissions, privacy policy URL, content rating
5. Choose a track                    internal → closed → open → production
6. Roll out                          staged: 5% → 20% → 50% → 100%
7. Watch                             crash rate, ANRs, reviews, Vitals
```

### AAB vs APK

| | **AAB** (Android App Bundle) | **APK** |
|---|---|---|
| What it is | What you upload; Google builds the right APK per device | The installable file |
| Size | ⭐ Smaller downloads (only the user's screen density, language, CPU) | Everything for everyone |
| Required? | **Yes for Play Store** since Aug 2021 | Still used for direct installs and other stores |

### The release tracks

| Track | Use |
|---|---|
| **Internal testing** | Up to 100 testers, available in minutes — your daily QA build |
| **Closed testing** | A named group (clients, a pilot clinic) |
| **Open testing** | Public beta |
| **Production** | Everyone, with **staged rollout** |

⭐ **Staged rollout is the mobile version of a canary release.** You cannot roll back an app the way you
roll back a server — users already downloaded it — so you release to 5%, watch the crash rate, then
increase. If it is bad, you **halt the rollout** and ship a fix.

### What gets a release rejected or delayed

| Issue | Fix |
|---|---|
| **Sensitive permissions** ⚠️ | `READ_CALL_LOG`, SMS and recording need a **declaration form** with an approved use case, and a privacy policy |
| **Data safety form** wrong | It must match what the app really collects and sends |
| Missing privacy policy | A public URL is mandatory |
| Target SDK too old | Google raises the required `targetSdkVersion` every year |
| Crashes in review | Test the **release** build, not only debug |

### Interview questions

**Q: Walk me through releasing an Android app.** → the 7 steps + AAB + the tracks + staged rollout.

**Q: How do you roll back a bad mobile release?**
> "You cannot un-install from users' phones. So: halt the staged rollout immediately so no new users get
> it, ship a fixed build fast, and if the bug is server-side or feature-flagged, turn it off remotely —
> which is exactly why important features ship behind a flag. Mobile is the strongest argument for
> feature flags."

---

## 16. ⭐ Releasing on the App Store — the full flow

```
1. Set the version and build number in Xcode
2. Archive                          Xcode → Product → Archive   (or EAS / Fastlane)
3. Upload to App Store Connect      Xcode Organizer, Transporter, or Fastlane
4. TestFlight                       internal testers instantly; external testers need a short review
5. Fill the listing                 screenshots per device size, description, keywords, privacy labels
6. Submit for review                ⚠️ a human reviews it — usually 1–3 days
7. Release                          manually, or automatically on approval; phased release over 7 days
```

### TestFlight

| | Internal | External |
|---|---|---|
| Who | Up to 100 team members | Up to 10,000 users |
| Review needed | ❌ No — available in minutes | ✅ A light review first |
| Build life | 90 days | 90 days |

### The classic App Store rejection reasons ⭐

| Reason | What it means |
|---|---|
| **Vague permission strings** | `NSCameraUsageDescription` must say *why*, in plain language |
| **Guideline 4.2 — "minimum functionality"** | An app that is just a website wrapper gets rejected |
| **Guideline 5.1.1 — sign-in** | If you offer social login, you may need **Sign in with Apple**; and you cannot demand an account for features that do not need one |
| **Guideline 3.1.1 — payments** | Digital goods must use **Apple's in-app purchase** (Apple takes a cut). Physical goods and services may use your own payment. ⭐ A real product decision. |
| **Account deletion** | If users can create an account in the app, they must be able to **delete** it in the app |
| **Crashes or broken demo login** | Give the reviewer working demo credentials in the notes |
| **Privacy labels wrong** | They must match what you actually collect |

⚠️ **Plan for review time.** Android can be live in hours; iOS is typically 1–3 days, and a rejection
restarts the clock. That changes how you plan a launch.

### Interview questions

**Q: Walk me through releasing an iOS app.** → the 7 steps + TestFlight + "a human reviews it".

**Q: Why might Apple reject an app?** → the table. The payments and permission-string ones are the most
impressive to name.

**Q: Play Store vs App Store — the practical differences?**
> "Android: AAB upload, automated review in hours, staged rollout by percentage, and sensitive
> permissions need declaration forms. iOS: archive and upload from Xcode, human review taking days,
> TestFlight for beta, stricter policy rules, and phased release over a week. The plan has to allow for
> iOS review time."

### Scenarios

**S4. A critical bug is live in production on both stores.**
> "First, stop the spread: halt the Android staged rollout, and if iOS is phased, pause that too — new
> users stop receiving it while existing ones are already affected.
> Then reduce the impact without a new build if I can: turn off the feature with a remote flag, or fix it
> server-side, because a store release takes hours on Android and days on iOS. If the fix needs a new
> build, I ship it and can request an **expedited review** from Apple, which they grant for genuine
> critical issues.
> Afterwards: why did our tests and the 5% rollout not catch it?"

---

## 17. OTA (over-the-air) updates

**The idea:** the JavaScript bundle can be updated **without** a store release — the native code cannot.

| Tool | Note |
|---|---|
| **EAS Update** (Expo) | The modern standard |
| **CodePush** | Microsoft's, long used; App Center is being retired — check the current status |
| Self-hosted | Possible, rarely worth it |

| ✅ OTA can change | ❌ OTA cannot change |
|---|---|
| JavaScript, React components, styles, most logic | Native modules, permissions, app icon, native dependencies, SDK version |

**Rules:**
- Both stores **allow** JavaScript updates that do not change the app's purpose. Do not use OTA to sneak
  in a different product — that is a policy violation.
- Keep OTA updates tied to a **native version**, or a user on an old binary gets JavaScript that calls a
  native module they do not have — an instant crash.
- Roll out OTA gradually too, and keep a rollback.

⭐ **Why this matters:** "OTA turns a 3-day iOS fix into a 10-minute one for JavaScript bugs. It does not
help with native crashes, so I still need staged rollout and flags."

### Interview questions

**Q: What is OTA and what are its limits?** → the table + the native-version rule.

---

## 18. CI/CD, testing and crash reporting for mobile

### The pipeline

```
push → lint + typecheck + unit tests
     → build Android AAB (signed with CI secrets)
     → build iOS IPA (macOS runner, signing via Fastlane Match)
     → upload: Play internal track + TestFlight
     → QA approves → promote to production / submit for review
```

| Tool | Use |
|---|---|
| **EAS Build** (Expo) | Cloud builds for both platforms — no Mac needed for iOS |
| **Fastlane** | Scripts for build, sign, screenshots and upload; `match` for certificates |
| **GitHub Actions / Bitrise / Codemagic** | The CI itself. ⚠️ iOS builds need a **macOS runner** |

⭐ **The detail to mention:** you cannot build iOS on Linux — so either a macOS runner or a cloud build
service. That surprises people who have only done backend CI.

### Testing (see [16 — Testing](16-testing-quality.md))

| Level | Tool |
|---|---|
| Logic and hooks | Jest |
| Components | React Native Testing Library |
| End-to-end | **Detox** — for the 2–3 flows that must never break |
| Real devices | Manual, plus a device farm (Firebase Test Lab, BrowserStack) |

⭐ Your honest line: "Native, device-specific behaviour — call state, overlays, OEM recording paths — I
tested manually on real devices, because an emulator does not reproduce those failures."

### Crash reporting and monitoring

**Sentry** or **Firebase Crashlytics**: crash rate per release, stack traces with **source maps** (upload
them at build time or the trace is unreadable), ANRs on Android, and adoption per version.

**Watch after every release:** crash-free users %, ANR rate, new crashes by version, and reviews.

### Interview questions

**Q: How do you ship a mobile release safely?**
> "Automated build in CI with signing from secrets, internal track and TestFlight for QA, then a staged
> rollout watching crash-free users. Risky features go behind a remote flag, JavaScript-only fixes can go
> out over the air, and source maps are uploaded so crash reports are readable."

### Scenarios

**S5. Crash reports show a spike, but the stack traces are unreadable.**
> "Source maps were not uploaded for that build, so the minified bundle cannot be mapped back. I upload
> them for that exact version, and add the upload step into the CI build so it can never be forgotten.
> Meanwhile I check which app version and OS the spike is on — that alone usually points at the cause."

---
---

# WRAP-UP

---

## 19. ⭐ Your project story — the CRM call pipeline

Draw this from memory. It is the most distinctive thing on your resume.

```
 Web dashboard ──click to call──► Laravel API ──► Pusher (private user channel)
                                                        ▼
 [ Android device ]  SocketService  (FOREGROUND SERVICE — survives backgrounding)
        │
        ├─► CallModule        places the call (ACTION_CALL intent)
        ├─► CallStateModule   listens for RINGING / OFFHOOK / IDLE
        ├─► OverlayModule     shows the matched lead over the dialer (SYSTEM_ALERT_WINDOW)
        │
        └─► write to LOCAL SQLITE FIRST  ⭐ (zero data loss)
                 │
                 └─► upload queue → recording file resolved (OEM-specific paths) → multipart upload
                                  → backend NLP: sentiment, talk ratio, topics, action items
                                  → pre-aggregated analytics → dashboard
```

**The numbers:** 5,000+ call logs, 2,000+ recordings, **zero data loss**.

**The four things to say while drawing:**
1. **Foreground service**, because Android kills background work and the socket must stay alive.
2. **Local write first**, because the phone is offline constantly — capture and sync are separate problems.
3. **OEM differences** in recording paths, handled for the common manufacturers — not solved universally.
4. **Overlay permission** is a settings-screen grant, so onboarding has to walk the user through it.

⭐ **The honest closer:** "The hard parts were not React Native. They were Android's background limits,
OEM behaviour, and permissions — and the design principle that made it reliable was writing locally
before anything touches the network."

---

## 20. Rapid-fire

### React Native
| Word | One line |
|---|---|
| **Real native views** | RN renders actual native widgets, not a WebView |
| **JS / UI / shadow threads** | Your code / drawing / layout |
| **Bridge (old)** | Async JSON messages between JS and native |
| **JSI** | JS holds a direct reference to native objects — synchronous calls |
| **TurboModules** | Lazily loaded, typed native modules |
| **Fabric** | The new renderer, tree in C++ |
| **Codegen** | Generates native glue from a TypeScript spec |
| **Hermes** | RN's JavaScript engine — fast start, bytecode |
| **FlatList** | Recycling list; `keyExtractor`, `getItemLayout`, `windowSize` |
| **Reanimated** | Animations on the UI thread |
| **`Platform.select`** | Per-platform values |

### Native Android
| Word | One line |
|---|---|
| **Native module** | Kotlin class exposed to JS with `@ReactMethod` |
| **Promise / event emitter** | JS→native result / native→JS push |
| **Foreground service** | Long-running work with a permanent notification |
| **`START_STICKY`** | Restart the service if the system kills it |
| **`SYSTEM_ALERT_WINDOW`** | Draw over other apps — a settings-screen grant |
| **`TYPE_APPLICATION_OVERLAY`** | The overlay window type (API 26+) |
| **Broadcast receiver** | Listens for system events like call state |
| **Doze / OEM killers** | Battery features that stop your service |
| **Scoped storage** | Limited file access since Android 10 |

### iOS & release
| Word | One line |
|---|---|
| **Swift / Xcode / CocoaPods** | Language / IDE / dependency manager |
| **`Info.plist` usage string** | Why you need a permission — required, and reviewed |
| **CallKit** | System UI for **your own** VoIP calls; not call-log access |
| **versionName vs versionCode** | What users see vs what the store counts |
| **Keystore** | Android signing key — lose it and you cannot update |
| **Play App Signing** | Google holds the real key; you use an upload key |
| **Certificate + provisioning profile** | iOS signing identity + what it may install |
| **AAB** | The bundle you upload to Play; Google builds per-device APKs |
| **IPA** | The iOS app package |
| **Internal / closed / open / production** | Play Store tracks |
| **Staged rollout** | Release to 5%, watch, increase |
| **TestFlight** | Apple's beta distribution |
| **Expedited review** | Ask Apple to review a critical fix faster |
| **OTA / EAS Update** | Update the JavaScript bundle without a store release |
| **Source maps** | Make crash traces readable |
| **Crash-free users %** | The number to watch after a release |

---

## 21. Self-check

**React Native**
- [ ] Explain how RN renders, and the three threads
- [ ] Explain the bridge vs JSI, Fabric, TurboModules, Codegen, Hermes
- [ ] List 6 FlatList performance levers
- [ ] Explain why an animation may stutter and how Reanimated helps

**Native Android**
- [ ] Write a Kotlin native module skeleton with a promise and an event
- [ ] Give 3 reasons a foreground service was required
- [ ] Explain the overlay permission flow and `FLAG_NOT_FOCUSABLE`
- [ ] Explain what OEM battery managers break and how you handled it
- [ ] Name the sensitive permissions that need a Play declaration

**Offline & product**
- [ ] Explain "write locally first" and the sync queue
- [ ] Explain client-generated IDs and idempotent upload
- [ ] Say which conflict strategy you chose, and why append-only avoids conflicts
- [ ] Explain push vs socket on mobile

**iOS & release**
- [ ] Say your honest iOS position (§13)
- [ ] Explain why the CRM's core features are Android-only
- [ ] Explain versionCode vs versionName, and the keystore risk
- [ ] Walk through a Play Store release with tracks and staged rollout
- [ ] Walk through an App Store release with TestFlight and review
- [ ] Name 4 App Store rejection reasons
- [ ] Explain OTA updates and their limits
- [ ] Say how you roll back a bad mobile release

---

## 22. Traps — how people lose this round

**React Native**
1. **"React Native is a WebView."** It renders real native views.
2. Saying "the bridge" as if it is still current — know JSI and Fabric.
3. **`.map()` inside a ScrollView** for a long list.
4. Index as `key` in a list that reorders.
5. Heavy work on the JS thread, then blaming React Native for being slow.
6. Not removing event listeners and native subscriptions on unmount.

**Native Android**
7. Background service instead of a **foreground** service for long-running work.
8. Forgetting `startForeground` within 5 seconds → crash.
9. Not handling OEM battery killers, then claiming it "works everywhere".
10. Leaking an overlay view after the call ends.
11. Treating `SYSTEM_ALERT_WINDOW` like a normal runtime permission.
12. **Over-claiming on OEM recording** — say what you handled and what you did not.

**Offline & data**
13. Writing to the network first and the database second.
14. No client-generated ID → duplicates after a retry.
15. Ordering events by the phone's clock.

**iOS & release**
16. Claiming deep iOS native experience you do not have.
17. Saying the call-tracking app could be ported to iOS as-is — it cannot.
18. Not knowing `versionCode` must increase on every upload.
19. Keystore in the repository, or with no backup.
20. Forgetting that **iOS review takes days** when planning a launch.
21. No staged rollout, so a crash reaches 100% of users.
22. Shipping without source maps, then being unable to read the crash.
23. Using OTA to change what the app does — a policy violation on both stores.
