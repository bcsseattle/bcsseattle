// swift-tools-version: 5.9
import PackageDescription

// DO NOT MODIFY THIS FILE - managed by Capacitor CLI commands
let package = Package(
    name: "CapApp-SPM",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapApp-SPM",
            targets: ["CapApp-SPM"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.6.0"),
        .package(name: "AparajitaCapacitorSecureStorage", path: "../../../../../node_modules/.pnpm/@aparajita+capacitor-secure-storage@8.0.1/node_modules/@aparajita/capacitor-secure-storage"),
        .package(name: "CapacitorApp", path: "../../../../../node_modules/.pnpm/@capacitor+app@8.1.2_@capacitor+core@8.6.0/node_modules/@capacitor/app"),
        .package(name: "CapacitorAppLauncher", path: "../../../../../node_modules/.pnpm/@capacitor+app-launcher@8.0.1_@capacitor+core@8.6.0/node_modules/@capacitor/app-launcher"),
        .package(name: "CapacitorBrowser", path: "../../../../../node_modules/.pnpm/@capacitor+browser@8.0.5_@capacitor+core@8.6.0/node_modules/@capacitor/browser"),
        .package(name: "CapacitorFilesystem", path: "../../../../../node_modules/.pnpm/@capacitor+filesystem@8.1.5_@capacitor+core@8.6.0/node_modules/@capacitor/filesystem"),
        .package(name: "CapacitorNetwork", path: "../../../../../node_modules/.pnpm/@capacitor+network@8.0.1_@capacitor+core@8.6.0/node_modules/@capacitor/network"),
        .package(name: "CapacitorPushNotifications", path: "../../../../../node_modules/.pnpm/@capacitor+push-notifications@8.1.3_@capacitor+core@8.6.0/node_modules/@capacitor/push-notifications"),
        .package(name: "CapacitorShare", path: "../../../../../node_modules/.pnpm/@capacitor+share@8.0.3_@capacitor+core@8.6.0/node_modules/@capacitor/share"),
        .package(name: "CapacitorSplashScreen", path: "../../../../../node_modules/.pnpm/@capacitor+splash-screen@8.0.2_@capacitor+core@8.6.0/node_modules/@capacitor/splash-screen"),
        .package(name: "CapacitorTextZoom", path: "../../../../../node_modules/.pnpm/@capacitor+text-zoom@8.0.1_@capacitor+core@8.6.0/node_modules/@capacitor/text-zoom")
    ],
    targets: [
        .target(
            name: "CapApp-SPM",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "AparajitaCapacitorSecureStorage", package: "AparajitaCapacitorSecureStorage"),
                .product(name: "CapacitorApp", package: "CapacitorApp"),
                .product(name: "CapacitorAppLauncher", package: "CapacitorAppLauncher"),
                .product(name: "CapacitorBrowser", package: "CapacitorBrowser"),
                .product(name: "CapacitorFilesystem", package: "CapacitorFilesystem"),
                .product(name: "CapacitorNetwork", package: "CapacitorNetwork"),
                .product(name: "CapacitorPushNotifications", package: "CapacitorPushNotifications"),
                .product(name: "CapacitorShare", package: "CapacitorShare"),
                .product(name: "CapacitorSplashScreen", package: "CapacitorSplashScreen"),
                .product(name: "CapacitorTextZoom", package: "CapacitorTextZoom")
            ]
        )
    ]
)
