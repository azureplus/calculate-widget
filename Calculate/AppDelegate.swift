//
//  AppDelegate.swift
//  Calculate
//
//  Created by David Brackeen on 3/10/20.
//  Copyright © 2020 David Brackeen. All rights reserved.
//

import Cocoa

@main
class AppDelegate: NSObject, NSApplicationDelegate {
    
    func applicationDidFinishLaunching(_ aNotification: Notification) {
        UserDefaults.standard.registerDefaults()
    }
    
    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        return true
    }

    func applicationDidResignActive(_ notification: Notification) {
        Calculate.shared.save()
    }

    func applicationWillTerminate(_ aNotification: Notification) {
        Calculate.shared.save()
    }
}
