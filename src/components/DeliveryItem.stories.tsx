import type { Meta, StoryObj } from "@storybook/react";
import { DeliveryItem } from "./DeliveryItem";

const meta: Meta<typeof DeliveryItem> = {
  title: "Logistics/DeliveryItem",
  component: DeliveryItem,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof DeliveryItem>;

const mockDelivery = {
  id: "1",
  status: "pending",
  destination_address: "Rua Exemplo, 123 - Centro",
  neighborhood: "Centro",
  city: "São Paulo",
  spx_tn: "SPX123456789",
  sequence: 1,
};

export const Pending: Story = {
  args: {
    delivery: mockDelivery,
    isSelected: false,
    index: 0,
    onSelect: (id) => console.log("Selected", id),
  },
};

export const Selected: Story = {
  args: {
    delivery: { ...mockDelivery, status: "in_transit" },
    isSelected: true,
    index: 0,
    onSelect: (id) => console.log("Selected", id),
  },
};

export const Delivered: Story = {
  args: {
    delivery: { ...mockDelivery, status: "delivered" },
    isSelected: false,
    index: 0,
    onSelect: (id) => console.log("Selected", id),
  },
};
