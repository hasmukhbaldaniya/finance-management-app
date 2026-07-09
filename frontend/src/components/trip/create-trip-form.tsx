"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createTrip } from "@/apis/trip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError, GENERIC_ERROR_MESSAGE } from "@/utils/apiManager/apiManager";
import { MAX_TRIP_NAME_LENGTH, MIN_TRIP_NAME_LENGTH } from "@/utils/constants/trip.constant";
import { ROUTES } from "@/utils/constants/route.constant";
import type { City } from "@/types/city.type";
import { CitySelect } from "./city-select";

type FieldErrors = {
  name?: string;
  startAt?: string;
  endAt?: string;
  startCity?: string;
  endCity?: string;
};

export function CreateTripForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [startCity, setStartCity] = useState<City | null>(null);
  const [endCity, setEndCity] = useState<City | null>(null);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validate(): FieldErrors {
    const nextErrors: FieldErrors = {};
    const trimmedName = name.trim();
    if (!trimmedName) {
      nextErrors.name = "Trip Name is required.";
    } else if (trimmedName.length < MIN_TRIP_NAME_LENGTH || trimmedName.length > MAX_TRIP_NAME_LENGTH) {
      nextErrors.name = `Trip Name must be between ${MIN_TRIP_NAME_LENGTH} and ${MAX_TRIP_NAME_LENGTH} characters.`;
    }
    if (!startAt) nextErrors.startAt = "Start Date & Time is required.";
    if (!endAt) {
      nextErrors.endAt = "End Date & Time is required.";
    } else if (startAt && new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      nextErrors.endAt = "End Date & Time must be after the Start Date & Time.";
    }
    if (!startCity) nextErrors.startCity = "Start Location is required.";
    if (!endCity) nextErrors.endCity = "End Location is required.";
    return nextErrors;
  }

  async function handleSubmit(): Promise<void> {
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0 || !startCity || !endCity) return;

    setIsSubmitting(true);
    try {
      await createTrip({
        name: name.trim(),
        startAt: new Date(startAt).toISOString(),
        endAt: new Date(endAt).toISOString(),
        startCityId: startCity.id,
        endCityId: endCity.id,
      });
      toast.success("Trip created.");
      router.push(ROUTES.TRIPS);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancel(): void {
    router.push(ROUTES.TRIPS);
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-6 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Create Trip</h1>

      <div className="space-y-2">
        <Label htmlFor="trip-name">Trip Name</Label>
        <Input
          id="trip-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Enter trip name"
          maxLength={MAX_TRIP_NAME_LENGTH}
          className="max-w-md"
        />
        {errors.name ? <p className="text-sm text-destructive">{errors.name}</p> : null}
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="start-at">Start Date & Time</Label>
          <Input id="start-at" type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} />
          {errors.startAt ? <p className="text-sm text-destructive">{errors.startAt}</p> : null}
        </div>
        <div className="space-y-2">
          <Label htmlFor="end-at">End Date & Time</Label>
          <Input id="end-at" type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)} />
          {errors.endAt ? <p className="text-sm text-destructive">{errors.endAt}</p> : null}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Start Location</Label>
          <CitySelect value={startCity} onChange={setStartCity} placeholder="Select start location" />
          {errors.startCity ? <p className="text-sm text-destructive">{errors.startCity}</p> : null}
        </div>
        <div className="space-y-2">
          <Label>End Location</Label>
          <CitySelect value={endCity} onChange={setEndCity} placeholder="Select end location" />
          {errors.endCity ? <p className="text-sm text-destructive">{errors.endCity}</p> : null}
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-border pt-6">
        <Button type="button" variant="outline" disabled={isSubmitting} onClick={handleCancel}>
          Cancel
        </Button>
        <Button type="button" disabled={isSubmitting} onClick={handleSubmit}>
          Create Trip
        </Button>
      </div>
    </div>
  );
}
