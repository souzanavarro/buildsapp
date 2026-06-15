import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "./input";

const meta: Meta<typeof Input> = {
  title: "UI/Input",
  component: Input,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Input>;

export const Default: Story = {
  args: {
    placeholder: "Enter route name...",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
    value: "Read-only input",
  },
};

export const Password: Story = {
  args: {
    type: "password",
    placeholder: "Password",
  },
};
