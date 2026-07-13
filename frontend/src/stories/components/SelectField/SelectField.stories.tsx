import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import Box from "@mui/material/Box";
import { SelectField } from "@/components/select-field";

const OPTIONS = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "pending", label: "Pending", disabled: true },
];

const meta = {
  title: "ui/SelectField",
  component: SelectField,
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
} satisfies Meta<typeof SelectField>;

export default meta;
type Story = StoryObj<typeof meta>;

// "" (an "All" option) is a real, selectable value here — not "nothing
// selected" — matching every filter dropdown across the app.
export const Default: Story = {
  args: { value: "", options: OPTIONS, onValueChange: () => {} },
  render: function SelectFieldStory() {
    const [value, setValue] = useState("");
    return <SelectField value={value} onValueChange={setValue} options={OPTIONS} placeholder="Select status" />;
  },
};

export const WithValue: Story = {
  args: { value: "active", options: OPTIONS, onValueChange: () => {} },
  render: function SelectFieldStory() {
    const [value, setValue] = useState("active");
    return <SelectField value={value} onValueChange={setValue} options={OPTIONS} placeholder="Select status" />;
  },
};

export const Disabled: Story = {
  args: {
    value: "active",
    options: OPTIONS,
    disabled: true,
    onValueChange: () => {},
  },
};

export const HasError: Story = {
  args: {
    value: "",
    options: OPTIONS,
    hasError: true,
    onValueChange: () => {},
  },
};
