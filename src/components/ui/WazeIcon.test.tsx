import { expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { WazeIcon } from './WazeIcon';
import '@testing-library/jest-dom';

test('WazeIcon renders correctly with accessibility label', () => {
  render(<WazeIcon className="test-class" />);
  const icon = screen.getByLabelText('Waze Icon');
  expect(icon).toBeInTheDocument();
  expect(icon).toHaveClass('test-class');
});
