import type { Meta, StoryObj } from "@storybook/react-vite";
import { PasswordInput } from "@/components/password-input";

const meta = {
  title: "components/PasswordInput",
  component: PasswordInput,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className="w-64">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PasswordInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    placeholder: "Password",
  },
};

export const WithValue: Story = {
  args: {
    defaultValue: "Passw0rd!",
  },
};

export const Disabled: Story = {
  args: {
    defaultValue: "Passw0rd!",
    disabled: true,
  },
};
