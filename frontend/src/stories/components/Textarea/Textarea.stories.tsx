import type { Meta, StoryObj } from "@storybook/react-vite";
import Box from "@mui/material/Box";
import { Textarea } from "@/components/ui/textarea";

const meta = {
  title: "ui/Textarea",
  component: Textarea,
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
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: "Describe when this category should be used...",
    rows: 3,
  },
};

export const WithValue: Story = {
  args: {
    defaultValue: "Used for team lunches and client meals.",
    rows: 3,
  },
};

export const Disabled: Story = {
  args: {
    defaultValue: "Used for team lunches and client meals.",
    disabled: true,
    rows: 3,
  },
};

export const Invalid: Story = {
  args: {
    defaultValue: "Too long a description that exceeds the limit",
    error: true,
    helperText: "Description must be 200 characters or fewer.",
    rows: 3,
  },
};
