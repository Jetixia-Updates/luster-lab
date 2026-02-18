/**
 * HR Module - In-memory store with JSON file persistence
 */

import * as fs from "fs";
import * as path from "path";
import type {
  HRDepartmentNeed,
  HRJobPosition,
  HRApplication,
} from "@shared/api";

const HR_FILE = path.join(process.cwd(), "data", "hr.json");

export let hrDepartmentNeeds: HRDepartmentNeed[] = [];
export let hrPositions: HRJobPosition[] = [];
export let hrApplications: HRApplication[] = [];

function loadHR() {
  try {
    const raw = fs.readFileSync(HR_FILE, "utf-8");
    const data = JSON.parse(raw);
    hrDepartmentNeeds = data.needs || [];
    hrPositions = data.positions || [];
    hrApplications = data.applications || [];
  } catch {
    hrDepartmentNeeds = [];
    hrPositions = [];
    hrApplications = [];
  }
}

function saveHR() {
  try {
    const dir = path.dirname(HR_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      HR_FILE,
      JSON.stringify(
        { needs: hrDepartmentNeeds, positions: hrPositions, applications: hrApplications },
        null,
        2
      ),
      "utf-8"
    );
  } catch (e) {
    console.error("[HR] save error:", e);
  }
}

export function initHRStore() {
  loadHR();
}

export function persistHRNeed(item: HRDepartmentNeed) {
  const idx = hrDepartmentNeeds.findIndex((n) => n.id === item.id);
  if (idx >= 0) hrDepartmentNeeds[idx] = item;
  else hrDepartmentNeeds.push(item);
  saveHR();
}

export function removeHRNeed(id: string) {
  hrDepartmentNeeds = hrDepartmentNeeds.filter((n) => n.id !== id);
  saveHR();
}

export function persistHRPosition(item: HRJobPosition) {
  const idx = hrPositions.findIndex((p) => p.id === item.id);
  if (idx >= 0) hrPositions[idx] = item;
  else hrPositions.push(item);
  saveHR();
}

export function removeHRPosition(id: string) {
  hrPositions = hrPositions.filter((p) => p.id !== id);
  hrApplications = hrApplications.filter((a) => a.positionId !== id);
  saveHR();
}

export function persistHRApplication(item: HRApplication) {
  const idx = hrApplications.findIndex((a) => a.id === item.id);
  if (idx >= 0) hrApplications[idx] = item;
  else hrApplications.push(item);
  saveHR();
}

export function removeHRApplication(id: string) {
  hrApplications = hrApplications.filter((a) => a.id !== id);
  saveHR();
}
