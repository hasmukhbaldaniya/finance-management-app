import type { Meta, StoryObj } from "@storybook/react-vite";
import { ComingSoon } from "@/components/coming-soon";

const meta = {
  title: "components/ComingSoon",
  component: ComingSoon,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof ComingSoon>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "Trips",
  },
};

export const LongTitle: Story = {
  args: {
    title: "Roles & Privileges",
  },
};
