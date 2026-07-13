import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import Box from "@mui/material/Box";
import { DateTimePicker } from "@/components/date-time-picker";

const meta = {
  title: "ui/DateTimePicker",
  component: DateTimePicker,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <Box sx={{ width: 288 }}>
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof DateTimePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

// value/onChange are always plain "YYYY-MM-DDTHH:mm" strings, matching
// native <input type="datetime-local">'s own value shape.
export const Default: Story = {
  args: { value: "", onChange: () => {} },
  render: function DateTimePickerStory() {
    const [value, setValue] = useState("");
    return <DateTimePicker value={value} onChange={setValue} placeholder="Select date & time" />;
  },
};

export const WithValue: Story = {
  args: { value: "2026-07-13T14:30", onChange: () => {} },
  render: function DateTimePickerStory() {
    const [value, setValue] = useState("2026-07-13T14:30");
    return <DateTimePicker value={value} onChange={setValue} placeholder="Select date & time" />;
  },
};

export const Disabled: Story = {
  args: { value: "2026-07-13T14:30", onChange: () => {}, disabled: true },
};
