//
//  Calculate.swift
//  Calculate
//
//  Created by David Brackeen on 3/10/20.
//  Copyright © 2020 David Brackeen. All rights reserved.
//

import Foundation
import JavaScriptCore

class Calculate {
    
    static let shared = Calculate()
    
    enum AngleMode: Int {
        case radians = 0
        case degrees = 1
    }
    
    var angleMode: AngleMode = .radians {
        didSet {
            updateAngleMode()
        }
    }
    
    func calc(_ expression: String, addToHistory: Bool = true) -> String? {
        memoryNeedsSaving = true
        
        if addToHistory {
            inputHistory.append(expression)
            if inputHistory.count > maxInputHistory {
                inputHistory.removeFirst(inputHistory.count - maxInputHistory)
            }
        }
        inputHistoryIndex = inputHistory.count
        
        let result = context.objectForKeyedSubscript("CalcWidget")?
            .objectForKeyedSubscript("Calc")?
            .objectForKeyedSubscript("calc")?
            .call(withArguments: [expression])
        return result?.toString()
    }
    
    func getUserVariables() -> [String] {
        return context.objectForKeyedSubscript("CalcWidget")?
            .objectForKeyedSubscript("Calc")?
            .objectForKeyedSubscript("getUserVars")?
            .call(withArguments: [])?.toArray() as? [String] ?? []
    }

    func getInputHistoryPrev() -> String? {
        if inputHistoryIndex > 0 {
            inputHistoryIndex = min(inputHistoryIndex - 1, inputHistory.count)
            return inputHistory[inputHistoryIndex]
        } else {
            return nil
        }
    }

    func getInputHistoryNext() -> String? {
        if inputHistoryIndex < inputHistory.count - 1 {
            inputHistoryIndex = max(0, inputHistoryIndex + 1);
            return inputHistory[inputHistoryIndex]
        } else {
            inputHistoryIndex = inputHistory.count
            return nil
        }
    }
    
    func isAtEndOfInputHistory() -> Bool {
        return inputHistoryIndex >= inputHistory.count
    }
    
    func getCompletions(prefix: String) -> [String] {
        guard let possibleCompletions = context.objectForKeyedSubscript("CalcWidget")?
            .objectForKeyedSubscript("Calc")?
            .objectForKeyedSubscript("getPossibleCompletions")?
            .call(withArguments: [])?.toArray() as? [String] else {
                return []
        }

        var completions = possibleCompletions.filter { $0.starts(with: prefix) }
        completions.sort()
        return completions
    }
    
    func save() {
        if memoryNeedsSaving {
            memoryNeedsSaving = false
            if let memory = context.objectForKeyedSubscript("CalcWidget")?
                .objectForKeyedSubscript("Calc")?
                .objectForKeyedSubscript("getMemory")?
                .call(withArguments: [])?.toString() {
                UserDefaults.standard.set(memory, forKey: memoryKey)
            }
        }
    }
    
    // MARK: - Private
    
    private let context = JSContext()!

    // Do not change these - the same keys are used for both this app and the legacy widget
    private let angleModeKey = "anglemode"
    private let memoryKey = "memory"
    private let widgetPreferencesMigratedKey = "widgetMigrated"
    
    private let maxInputHistory = 1000
    private var inputHistory: [String] = []
    private var inputHistoryIndex = -1
    
    private var memoryNeedsSaving = false
    
    private init() {
        evalulateScript("antlr3-all")
        evalulateScript("ECMAScript3ExtLexer")
        evalulateScript("ECMAScript3ExtParser")
        evalulateScript("ECMAScript3ExtEmitter")
        evalulateScript("FPError")
        evalulateScript("Util")
        evalulateScript("Calc")
                
        migrateWidgetPreferences()
        loadPreferences()
    }
    
    private func evalulateScript(_ name: String) {
        guard let url = Bundle.main.url(forResource: name, withExtension: "js") else {
            fatalError("Couldn't find \(name).js")
        }
        
        guard let source = try? String(contentsOf: url) else {
            fatalError("Couldn't load \(name).js")
        }

        context.exceptionHandler = { context, exception in
            let exceptionString = exception?.toString() ?? ""
            print("Error loading \(name).js: \(exceptionString)")
        }
        context.evaluateScript(source, withSourceURL: url)
    }
    
    private func loadPreferences() {
        angleMode = AngleMode(rawValue: UserDefaults.standard.integer(forKey: angleModeKey)) ?? .radians
        
        if let memory = UserDefaults.standard.string(forKey: memoryKey) {
            context.objectForKeyedSubscript("CalcWidget")?
                .objectForKeyedSubscript("Calc")?
                .objectForKeyedSubscript("applyExpression")?
                .call(withArguments: [memory])
        }
    }
    
    private func updateAngleMode() {
        UserDefaults.standard.set(angleMode.rawValue, forKey: angleModeKey)
        
        context.objectForKeyedSubscript("CalcWidget")?
            .objectForKeyedSubscript("Calc")?
            .objectForKeyedSubscript("setAngleMode")?
            .call(withArguments: [angleMode.rawValue])
    }
    
    private func migrateWidgetPreferences() {
        let migrated = UserDefaults.standard.bool(forKey: widgetPreferencesMigratedKey)
        guard !migrated else {
            return
        }
        
        UserDefaults.standard.set(true, forKey: widgetPreferencesMigratedKey)
        
        /*
         The widget preferences file "~/Library/Preferences/widget-com.brackeen.widget.calc.plist"
         was migrated to the app's sandbox on first launch. (See container-migration.plist).
         If the file exists, copy the preferences to UserDefaults and delete the file.
         
         To test this:
         1. Make sure widget plist exists at "~/Library/Preferences/widget-com.brackeen.widget.calc.plist"
         2. Delete the app's container at "~/Library/Containers/com.brackeen.Calculate/"
         3. Launch the app
         4. Check "~/Library/Containers/com.brackeen.Calculate/Data/Library/Preferences/com.brackeen.Calculate.plist"
         */
        guard let widgetPreferencesPath = FileManager.default.urls(for: .libraryDirectory, in: .userDomainMask).first?.appendingPathComponent("Preferences").appendingPathComponent("widget-com.brackeen.widget.calc.plist").path,
            FileManager.default.fileExists(atPath: widgetPreferencesPath) else {
            return
        }
        
        let widgetPreferences = NSDictionary(contentsOfFile: widgetPreferencesPath) as? Dictionary<String, AnyObject> ?? [:]
        if let angleModeString = widgetPreferences[angleModeKey] as? String,
            let angleModeInt = Int(angleModeString),
            let angleMode = AngleMode(rawValue: angleModeInt) {
            UserDefaults.standard.set(angleMode.rawValue, forKey: angleModeKey)
        }
        if let memory = widgetPreferences[memoryKey] as? String {
            UserDefaults.standard.set(memory, forKey: memoryKey)
        }
        
        try? FileManager.default.removeItem(atPath: widgetPreferencesPath)
    }
}