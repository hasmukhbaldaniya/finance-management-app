import type { Meta, StoryObj } from "@storybook/react-vite";
import { toast, Toaster } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";

// 026's MUI Migration — `toast.loading(...)` was only ever used in this
// demo story, never real app code, and MUI's Alert has no "loading"
// severity to match it to — dropped here along with the rest of sonner.
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
      <Button variant="outline" onClick={() => toast.warning("Possible duplicate bill — this looks like a bill you've already claimed.")}>
        Show warning
      </Button>
      <Button variant="outline" onClick={() => toast.info("A new OTP has been sent to your email.")}>
        Show info
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
