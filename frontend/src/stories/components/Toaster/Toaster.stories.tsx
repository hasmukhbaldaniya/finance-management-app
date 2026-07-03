import type { Meta, StoryObj } from "@storybook/react-vite";
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";

const ToasterDemo = () => (
  <>
    <Toaster />
    <div className="flex flex-wrap gap-3">
      <Button variant="outline" onClick={() => toast.success("Password reset successful.")}>
        Show success
      </Button>
      <Button variant="outline" onClick={() => toast.error("Invalid email/phone number or password.")}>
        Show error
      </Button>
      <Button variant="outline" onClick={() => toast.info("A new OTP has been sent to your email.")}>
        Show info
      </Button>
      <Button variant="outline" onClick={() => toast.loading("Verifying…")}>
        Show loading
      </Button>
    </div>
  </>
);

const meta = {
  title: "ui/Toaster",
  component: ToasterDemo,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof ToasterDemo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
