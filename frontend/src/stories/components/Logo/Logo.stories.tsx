import type { Meta, StoryObj } from "@storybook/react-vite";
import { Logo, LogoMark } from "@/components/logo";

const meta = {
  title: "ui/Logo",
  component: Logo,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof Logo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const MarkOnly: Story = {
  render: () => <LogoMark className="size-9" />,
};
