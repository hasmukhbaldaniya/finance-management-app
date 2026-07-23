import type { Meta, StoryObj } from "@storybook/react-vite";
import { AuthCard } from "@/components/auth-card";
import { Button } from "@/components/ui/button";

const meta = {
  title: "components/AuthCard",
  component: AuthCard,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof AuthCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Log in",
    children: <Button sx={{ width: "100%" }}>Login</Button>,
  },
};

export const WithDescription: Story = {
  args: {
    title: "Forgot password",
    description: "Enter your email to receive a one-time password.",
    children: <Button sx={{ width: "100%" }}>Submit</Button>,
  },
};

export const LongContent: Story = {
  args: {
    title: "Register your company",
    description:
      "This is a deliberately long description to verify the card layout wraps gracefully instead of overflowing or breaking the surrounding chrome on narrow viewports.",
    children: <Button sx={{ width: "100%" }}>Continue</Button>,
  },
};
