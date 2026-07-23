import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import Box from "@mui/material/Box";
import { DatePicker } from "@/components/date-picker";

const meta = {
  title: "ui/DatePicker",
  component: DatePicker,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <Box sx={{ width: 256 }}>
        <Story />
      </Box>
    ),
  ],
} satisfies Meta<typeof DatePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

// value/onChange are always plain "YYYY-MM-DD" strings, matching native
// <input type="date">'s own value shape — never a Date object.
export const Default: Story = {
  args: { value: "", onChange: () => {} },
  render: function DatePickerStory() {
    const [value, setValue] = useState("");
    return <DatePicker value={value} onChange={setValue} placeholder="Select date" />;
  },
};

export const WithValue: Story = {
  args: { value: "2026-07-13", onChange: () => {} },
  render: function DatePickerStory() {
    const [value, setValue] = useState("2026-07-13");
    return <DatePicker value={value} onChange={setValue} placeholder="Select date" />;
  },
};

export const Disabled: Story = {
  args: { value: "2026-07-13", onChange: () => {}, disabled: true },
};
