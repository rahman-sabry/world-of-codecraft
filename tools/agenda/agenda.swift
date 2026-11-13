// World of Codecraft's calendar helper: the next 24 hours of the macOS Calendar app (every calendar, Google accounts
// synced into it included), read through EventKit, as JSON on stdout for the mod (agenda.js):
//   [{ "title", "start", "end" (epoch ms), "allDay", "calendar", "meet" (a Google Meet link or null) }], by start.
// No access (denied, restricted, write-only, or the prompt still open): {"error": "denied"} or {"error": "pending"}.
// Always exits 0. Nothing leaves the machine.
//   agenda --stats   counts only (events, all-day ones, and where their Meet links were found), no titles or links

import EventKit
import Foundation

let ATTENTE: Double = 20 // s to wait for the permission prompt's answer (the mod's exec times out at 30)
let MEET = try! NSRegularExpression(pattern: "https://meet\\.google\\.com/[a-z0-9-]+(\\?[^\\s\"'<>]*)?")

func sortie(_ v: Any) {
  let d = try! JSONSerialization.data(withJSONObject: v, options: [.sortedKeys])
  FileHandle.standardOutput.write(d)
  FileHandle.standardOutput.write("\n".data(using: .utf8)!)
  exit(0)
}

/** The first Google Meet link in a text, or nil. */
func meet(_ s: String?) -> String? {
  guard let s = s else { return nil }
  let r = NSRange(s.startIndex..., in: s)
  guard let m = MEET.firstMatch(in: s, range: r), let rr = Range(m.range, in: s) else { return nil }
  return String(s[rr])
}

let store = EKEventStore()

func autorise() -> Bool {
  let st = EKEventStore.authorizationStatus(for: .event)
  if #available(macOS 14.0, *) {
    if st == .fullAccess { return true }
  } else if st == .authorized { return true }
  if st != .notDetermined { sortie(["error": "denied"]) }
  // first run: ask (macOS shows its dialog for the app that launched us)
  let sem = DispatchSemaphore(value: 0)
  var ok = false
  let fin: (Bool, Error?) -> Void = { g, _ in ok = g; sem.signal() }
  if #available(macOS 14.0, *) { store.requestFullAccessToEvents(completion: fin) }
  else { store.requestAccess(to: .event, completion: fin) }
  if sem.wait(timeout: .now() + ATTENTE) == .timedOut { sortie(["error": "pending"]) }
  return ok
}

if !autorise() { sortie(["error": "denied"]) }

let maintenant = Date()
let pred = store.predicateForEvents(withStart: maintenant, end: maintenant.addingTimeInterval(24 * 3600), calendars: nil)
let evts = store.events(matching: pred).filter { $0.endDate > maintenant }.sorted { $0.startDate < $1.startDate }
let ms = { (d: Date) in Int64((d.timeIntervalSince1970 * 1000).rounded()) }

if CommandLine.arguments.contains("--stats") {
  var champs = ["url": 0, "location": 0, "notes": 0, "none": 0]
  for e in evts {
    let k = meet(e.url?.absoluteString) != nil ? "url" : meet(e.location) != nil ? "location" : meet(e.notes) != nil ? "notes" : "none"
    champs[k]! += 1
  }
  sortie(["events": evts.count, "allDay": evts.filter { $0.isAllDay }.count, "meet": champs])
}

sortie(evts.map { e -> [String: Any] in
  [
    "title": e.title ?? "",
    "start": ms(e.startDate),
    "end": ms(e.endDate),
    "allDay": e.isAllDay,
    "calendar": e.calendar?.title ?? "",
    "meet": (meet(e.url?.absoluteString) ?? meet(e.location) ?? meet(e.notes)).map { $0 as Any } ?? NSNull(),
  ]
})
