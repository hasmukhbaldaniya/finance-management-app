import type { Meta, StoryObj } from "@storybook/react-vite";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const meta = {
  title: "ui/DropdownMenu",
  component: DropdownMenu,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof DropdownMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { children: null },
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline">Open menu</Button>} />
      <DropdownMenuContent>
        <DropdownMenuItem>Item one</DropdownMenuItem>
        <DropdownMenuItem>Item two</DropdownMenuItem>
        <DropdownMenuItem disabled>Disabled item</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};

// Matches header.tsx's actual Profile menu shape — a plain identity div,
// not a DropdownMenuLabel/Group (neither has a real caller anywhere in
// the app, see this component's own file comment).
export const WithIdentityAndDestructiveItem: Story = {
  args: { children: null },
  render: () => (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline">Jane Doe</Button>} />
      <DropdownMenuContent align="end">
        <Box sx={{ px: 1.5, py: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            Jane Doe
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Acme Corp
          </Typography>
        </Box>
        <DropdownMenuSeparator />
        <DropdownMenuItem>View Profile</DropdownMenuItem>
        <DropdownMenuItem variant="destructive">Logout</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};
