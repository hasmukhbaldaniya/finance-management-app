import type { Meta, StoryObj } from "@storybook/react-vite";
import { Label } from "./label";

const meta = {
  title: "ui/Label",
  component: Label,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "Email",
  },
};

export const WithForAttribute: Story = {
  args: {
    htmlFor: "email",
    children: "Email address",
  },
};
