import { renderHook, act } from "@testing-library/react";

import { useLickEngine } from "@/hooks/useLickEngine";
import { Transport } from "@/hooks/transport";


describe("useLickEngine", () => {
  it("lets the full saved segment play before looping back to the lick start", () => {
    const seek = jest.fn();
    const setSpeed = jest.fn();

    const baseTransport: Transport = {
      play: jest.fn(),
      pause: jest.fn(),
      seek,
      setSpeed,
      currentTime: 0,
      duration: 120,
      isPlaying: true,
      error: null,
    };

    const licks = [
      {
        id: 1,
        track: 1,
        name: "Intro",
        start_seconds: 10,
        end_seconds: 42,
        last_speed: 0.75,
        position: 0,
        created_at: "",
        updated_at: "",
      },
    ];

    const { result, rerender } = renderHook(
      ({ transport }) =>
        useLickEngine({
          licks,
          trackLastSpeed: 1,
          transport,
          normalizeSpeed: (speed) => speed,
          onPersistTrackSpeed: jest.fn(),
          onPersistLickSpeed: jest.fn(),
        }),
      {
        initialProps: { transport: baseTransport },
      }
    );

    act(() => {
      result.current.toggleLick(1);
    });

    expect(seek).toHaveBeenCalledWith(10);
    expect(setSpeed).toHaveBeenCalledWith(0.75);
    seek.mockClear();

    rerender({
      transport: {
        ...baseTransport,
        currentTime: 12.2,
      },
    });

    expect(seek).not.toHaveBeenCalled();

    rerender({
      transport: {
        ...baseTransport,
        currentTime: 42.2,
      },
    });

    expect(seek).toHaveBeenCalledTimes(1);
    expect(seek).toHaveBeenCalledWith(10);
  });
});
