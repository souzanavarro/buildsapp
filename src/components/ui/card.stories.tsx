import type { Meta, StoryObj } from "@storybook/react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./card";

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  component: Card,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card className="w-[350px]">
      <CardHeader>
        <CardTitle>Enterprise Analytics</CardTitle>
        <CardDescription>Daily performance report summary.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>Your routes are 15% more efficient today compared to last week.</p>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">Updated 2 minutes ago</p>
      </CardFooter>
    </Card>
  ),
};
