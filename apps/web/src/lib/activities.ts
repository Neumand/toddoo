import type { Activity, ActivityData, Borough, ActivityCategory } from "@toddoo/types";
import data from "../../../../data/activities.json";

const activityData = data as ActivityData;

export function getAllActivities(): Activity[] {
  return activityData.activities;
}

export function getActivityBySlug(slug: string): Activity | undefined {
  return activityData.activities.find((a) => a.slug === slug);
}

export function getUpcomingActivities(): Activity[] {
  const today = new Date().toISOString().split("T")[0];
  return activityData.activities.filter((a) => {
    if (!a.startDate) return true; // ongoing activities
    return a.startDate >= today || (a.endDate && a.endDate >= today);
  });
}

export function getActivitiesByBorough(borough: Borough): Activity[] {
  return activityData.activities.filter((a) => a.borough === borough);
}

export function getActivitiesByCategory(category: ActivityCategory): Activity[] {
  return activityData.activities.filter((a) => a.category === category);
}

export function getLastUpdated(): string {
  return activityData.lastUpdated;
}

export function getBoroughs(): string[] {
  return [...activityData.region.boroughs];
}

export function getAllSlugs(): string[] {
  return activityData.activities.map((a) => a.slug);
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Ongoing";
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
