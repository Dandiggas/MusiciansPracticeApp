/**
 * @jest-environment jsdom
 */
import { render, screen, fireEvent } from "@testing-library/react";
import MetronomeWidget from "./MetronomeWidget";

// Props mirror the real MetronomeWidgetProps interface. If the interface
// has diverged by the time this runs, read the widget and reconcile — the
// point of this test is the volume slider, not the rest.
const baseProps = {
  bpm: 120,
  isActive: false,
  currentBeat: 0,
  beatsPerMeasure: 4,
  onBpmChange: jest.fn(),
  onBeatsPerMeasureChange: jest.fn(),
  onToggle: jest.fn(),
  onTapTempo: jest.fn(),
  volume: 0.8,
  onVolumeChange: jest.fn(),
};

describe("MetronomeWidget — volume slider", () => {
  it("renders a slider with aria-label 'Metronome volume' and the supplied value", () => {
    render(<MetronomeWidget {...baseProps} volume={0.3} />);
    const slider = screen.getByLabelText("Metronome volume") as HTMLInputElement;
    expect(slider).toBeInTheDocument();
    expect(slider.type).toBe("range");
    expect(slider.min).toBe("0");
    expect(slider.max).toBe("1");
    expect(Number(slider.value)).toBeCloseTo(0.3, 2);
  });

  it("calls onVolumeChange with the new numeric value when dragged", () => {
    const onVolumeChange = jest.fn();
    render(
      <MetronomeWidget
        {...baseProps}
        volume={0.5}
        onVolumeChange={onVolumeChange}
      />,
    );
    const slider = screen.getByLabelText("Metronome volume");
    fireEvent.change(slider, { target: { value: "0.72" } });
    expect(onVolumeChange).toHaveBeenCalledWith(0.72);
  });

  it("shows the 'muted' icon when volume is 0", () => {
    render(<MetronomeWidget {...baseProps} volume={0} />);
    expect(screen.getByTestId("volume-icon-muted")).toBeInTheDocument();
  });

  it("shows the 'low' icon when 0 < volume < 0.5", () => {
    render(<MetronomeWidget {...baseProps} volume={0.3} />);
    expect(screen.getByTestId("volume-icon-low")).toBeInTheDocument();
  });

  it("shows the 'high' icon when volume >= 0.5", () => {
    render(<MetronomeWidget {...baseProps} volume={0.8} />);
    expect(screen.getByTestId("volume-icon-high")).toBeInTheDocument();
  });
});
