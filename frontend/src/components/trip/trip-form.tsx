"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { toast } from "@/components/ui/toast";
import { createTrip, updateTrip } from "@/apis/trip";
import { DateTimePicker } from "@/components/date-time-picker";
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

export type TripFormInitialValues = {
  name: string;
  startAt: string;
  endAt: string;
  startCity: City;
  endCity: City;
};

type TripFormProps =
  | { mode: "create"; initialValues?: undefined; tripId?: undefined }
  | { mode: "edit"; tripId: number; initialValues: TripFormInitialValues };

// Shared by 018's Create Trip and 021's Edit Trip — identical fields and
// validation either way (021's own Validation Rules Summary: "identical to
// 018's own table"), differing only in which API call submits and where
// Cancel/success land.
export function TripForm(props: TripFormProps) {
  const router = useRouter();
  const isEdit = props.mode === "edit";

  const [name, setName] = useState(props.initialValues?.name ?? "");
  const [startAt, setStartAt] = useState(props.initialValues?.startAt ?? "");
  const [endAt, setEndAt] = useState(props.initialValues?.endAt ?? "");
  const [startCity, setStartCity] = useState<City | null>(props.initialValues?.startCity ?? null);
  const [endCity, setEndCity] = useState<City | null>(props.initialValues?.endCity ?? null);
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

  const returnRoute = isEdit ? ROUTES.tripDetails(props.tripId) : ROUTES.TRIPS;

  async function handleSubmit(): Promise<void> {
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0 || !startCity || !endCity) return;

    const payload = {
      name: name.trim(),
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      startCityId: startCity.id,
      endCityId: endCity.id,
    };

    setIsSubmitting(true);
    try {
      if (isEdit) {
        await updateTrip(props.tripId, payload);
        toast.success("Trip updated.");
      } else {
        await createTrip(payload);
        toast.success("Trip created.");
      }
      router.push(returnRoute);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : GENERIC_ERROR_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCancel(): void {
    router.push(returnRoute);
  }

  return (
    <Stack spacing={4} sx={{ mx: "auto", maxWidth: 896, px: 3, py: 4 }}>
      <Typography variant="h5" sx={{ fontWeight: 600, letterSpacing: "-0.01em" }}>
        {isEdit ? "Edit Trip" : "Create Trip"}
      </Typography>

      <Stack spacing={1}>
        <Label htmlFor="trip-name">Trip Name</Label>
        <Input
          id="trip-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Enter trip name"
          maxLength={MAX_TRIP_NAME_LENGTH}
          sx={{ maxWidth: 448 }}
        />
        {errors.name ? (
          <Typography variant="body2" color="error">
            {errors.name}
          </Typography>
        ) : null}
      </Stack>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 3 }}>
        <Stack spacing={1}>
          <Label htmlFor="start-at">Start Date & Time</Label>
          <DateTimePicker id="start-at" value={startAt} onChange={setStartAt} />
          {errors.startAt ? (
            <Typography variant="body2" color="error">
              {errors.startAt}
            </Typography>
          ) : null}
        </Stack>
        <Stack spacing={1}>
          <Label htmlFor="end-at">End Date & Time</Label>
          <DateTimePicker id="end-at" value={endAt} onChange={setEndAt} />
          {errors.endAt ? (
            <Typography variant="body2" color="error">
              {errors.endAt}
            </Typography>
          ) : null}
        </Stack>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 3 }}>
        <Stack spacing={1}>
          <Label>Start Location</Label>
          <CitySelect value={startCity} onChange={setStartCity} placeholder="Select start location" />
          {errors.startCity ? (
            <Typography variant="body2" color="error">
              {errors.startCity}
            </Typography>
          ) : null}
        </Stack>
        <Stack spacing={1}>
          <Label>End Location</Label>
          <CitySelect value={endCity} onChange={setEndCity} placeholder="Select end location" />
          {errors.endCity ? (
            <Typography variant="body2" color="error">
              {errors.endCity}
            </Typography>
          ) : null}
        </Stack>
      </Box>

      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", justifyContent: "flex-end", borderTop: 1, borderColor: "divider", pt: 3 }}>
        <Button type="button" variant="outline" disabled={isSubmitting} onClick={handleCancel}>
          Cancel
        </Button>
        <Button type="button" disabled={isSubmitting} onClick={handleSubmit}>
          {isEdit ? "Save Changes" : "Create Trip"}
        </Button>
      </Stack>
    </Stack>
  );
}
