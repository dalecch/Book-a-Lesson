# Book堂 (Book Lesson)

Book堂 is a private booking book for one Hong Kong tutor and the families they already teach. Parents and students book only the tutor’s open times, through an invitation, a QR code, or a link. It is not a marketplace, it does not match tutors, and it does not take a commission on tuition. The tutor pays the software fee. Students and parents do not.

The GitHub repository name is Book-a-Lesson. The product name is Book堂, in English **Book Lesson**.

This pull request is a local preview. It does not publish to the App Store or Google Play, and it does not deploy production hosting.

## Languages

The iOS app, the Android app, and the web booking link use the same three locales:

- **繁體** — Traditional Chinese (`zh-Hant`), the default for Hong Kong
- **简体** — Simplified Chinese (`zh-Hans`)
- **EN** — English

Switch with the three buttons in the header. Simplified copy is written for the same screens as Traditional, including booking rules, payment requests, and error messages.

## Demo

Password for every account: `booktang`

| Role | Email | What to try |
| --- | --- | --- |
| Tutor, 張敏怡 / 张敏怡 / Cheung Man Yee | `dale.tutor@booklesson.demo` | Open times, timetable, invites, mark an FPS transfer received, apply a software-fee promo |
| Parent, 陳太 / 陈太 / Mrs Chan | `dale.parent@booklesson.demo` | Book for 陳小明, see the shared credit balance, request a package |
| Student, 陳小明 / 陈小明 / Chan Siu Ming | `dale.student@booklesson.demo` | View the same timetable and balance, book an open slot |

Demo data stays in the browser or on the device. **Reset demo data** on the sign-in screen restores the seed.

Parent booking link (no app install):

`/book/cheung-man-yee?invite=parent-siu-ming`

Student link:

`/join/student-siu-ming`

Example software-fee codes, not a marketing campaign:

- `DEMO10` — HKD 10 off, valid through 2027
- `DEMO20PCT` — 20% off, valid through 2027
- `OLDDEMO` — expired, so it is rejected

The monthly software fee defaults to **HKD 98** and can be changed on the tutor’s plan screen. Up to 2 students stay free. The seeded tutor is on a no-card trial with 3 students, so the paid tier is visible. Cancelling the plan leaves existing lessons and credit balances readable and pauses new bookings.

Tuition is recorded as FPS (轉數快 / 转数快) or a bank transfer. The tutor marks a payment received after checking the transfer. There is no card checkout.

## Run the web booking flow

```bash
npm install
npm run web
```

Open `http://localhost:8081`. On a phone on the same network, use the machine’s LAN address instead of `localhost` when you copy an invite or QR link. The tutor plan screen can store that origin for native QR codes.

## Run the iOS app

Requires macOS and Xcode. This preview does not use a store listing.

```bash
npm install
npm run ios
```

That runs the native iOS build (`expo run:ios`). The Xcode project is in `ios/`. On macOS, CocoaPods installs during the build. This preview does not open a store listing.

## Run the Android app

Requires Android Studio or a device with USB debugging.

```bash
npm install
npm run android
```

That runs the native Android build (`expo run:android`). The Android Studio project is in `android/`. This preview does not open a Play Console listing.

## Checks

```bash
npm test
npm run typecheck
```

Tests cover the credit ledger. A makeup lesson does not add or remove a credit: leave keeps the original deduction and opens one makeup entitlement; booking or cancelling that makeup leaves the balance unchanged.

## Booking rules in this preview

- Cancel at least 24 hours before the lesson (the tutor can change the cutoff) and a held credit is returned.
- Leave inside that window keeps the credit used and opens one makeup.
- A makeup books an open slot and does not deduct again.
- A trial does not use credits. Each student gets one.
- Rescheduling moves the same lesson and does not change the balance.
- Weekly booking creates one lesson per open week. Cancelling one week follows the single-lesson rule.
- The tutor can confirm instantly or confirm each request. Declining a request returns a held credit.
- After the software plan is cancelled, history stays visible and new bookings pause.
