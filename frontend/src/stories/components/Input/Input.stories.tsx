import type { Meta, StoryObj } from "@storybook/react-vite";
import Box from "@mui/material/Box";
import { Input } from "@/components/ui/input";

const meta = {
  title: "ui/Input",
  component: Input,
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
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: "Email",
  },
};

export const WithValue: Story = {
  args: {
    defaultValue: "demo@example.com",
  },
};

export const Disabled: Story = {
  args: {
    defaultValue: "demo@example.com",
    disabled: true,
  },
};

export const Invalid: Story = {
  args: {
    defaultValue: "not-an-email",
    "aria-invalid": true,
  },
};

export const Password: Story = {
  args: {
    type: "password",
    defaultValue: "Passw0rd!",
  },
};
