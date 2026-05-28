import { createElement, useEffect } from "react";
import { act, render, waitFor } from "@testing-library/react";

import { applyYoutubePlaybackRate, useYoutubeTransport } from "@/hooks/useYoutubeTransport";


describe("applyYoutubePlaybackRate", () => {
  it("does nothing when the player has not exposed setPlaybackRate yet", () => {
    expect(() =>
      applyYoutubePlaybackRate(
        {
          getAvailablePlaybackRates: () => [0.25, 0.5, 0.75, 1],
        },
        0.75
      )
    ).not.toThrow();
  });

  it("chooses the nearest available YouTube playback speed", () => {
    const setPlaybackRate = jest.fn();

    applyYoutubePlaybackRate(
      {
        getAvailablePlaybackRates: () => [0.25, 0.5, 1],
        setPlaybackRate,
      },
      0.7
    );

    expect(setPlaybackRate).toHaveBeenCalledWith(0.5);
  });
});

describe("useYoutubeTransport", () => {
  const originalYT = window.YT;
  const originalOnReady = window.onYouTubeIframeAPIReady;

  function Harness({
    onUpdate,
  }: {
    onUpdate: (state: ReturnType<typeof useYoutubeTransport>) => void;
  }) {
    const state = useYoutubeTransport("https://www.youtube.com/watch?v=abcdefghijk");

    useEffect(() => {
      onUpdate(state);
    }, [onUpdate, state]);

    return createElement("div", { ref: state.mountRef });
  }

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    window.YT = originalYT;
    window.onYouTubeIframeAPIReady = originalOnReady;
    document.body.innerHTML = "";
  });

  it("starts polling current time after the YouTube player is ready", async () => {
    let currentTime = 0;
    let playerOptions: YT.PlayerOptions | null = null;
    const player = {
      destroy: jest.fn(),
      getAvailablePlaybackRates: () => [0.25, 0.5, 0.75, 1],
      getCurrentTime: jest.fn(() => currentTime),
      getDuration: jest.fn(() => 180),
      pauseVideo: jest.fn(),
      playVideo: jest.fn(),
      seekTo: jest.fn(),
      setPlaybackRate: jest.fn(),
    } as unknown as YT.Player;

    window.YT = {
      Player: jest.fn((_node: HTMLElement, options: YT.PlayerOptions) => {
        playerOptions = options;
        return player;
      }),
      PlayerState: {
        UNSTARTED: -1,
        ENDED: 0,
        PLAYING: 1,
        PAUSED: 2,
        BUFFERING: 3,
        CUED: 5,
      },
    } as unknown as typeof YT;

    let hookState: ReturnType<typeof useYoutubeTransport> | null = null;
    render(createElement(Harness, { onUpdate: (state) => { hookState = state; } }));

    await waitFor(() => expect(window.YT?.Player as jest.Mock).toHaveBeenCalled());

    act(() => {
      playerOptions?.events?.onReady?.({ target: player });
    });

    expect(hookState?.transport.duration).toBe(180);
    expect(hookState?.transport.currentTime).toBe(0);

    currentTime = 42;
    act(() => {
      jest.advanceTimersByTime(250);
    });

    await waitFor(() => expect(hookState?.transport.currentTime).toBe(42));
  });

  it("updates the scrubber state immediately when seeking", async () => {
    let playerOptions: YT.PlayerOptions | null = null;
    const seekTo = jest.fn();
    const player = {
      destroy: jest.fn(),
      getAvailablePlaybackRates: () => [0.25, 0.5, 0.75, 1],
      getCurrentTime: jest.fn(() => 0),
      getDuration: jest.fn(() => 180),
      pauseVideo: jest.fn(),
      playVideo: jest.fn(),
      seekTo,
      setPlaybackRate: jest.fn(),
    } as unknown as YT.Player;

    window.YT = {
      Player: jest.fn((_node: HTMLElement, options: YT.PlayerOptions) => {
        playerOptions = options;
        return player;
      }),
      PlayerState: {
        UNSTARTED: -1,
        ENDED: 0,
        PLAYING: 1,
        PAUSED: 2,
        BUFFERING: 3,
        CUED: 5,
      },
    } as unknown as typeof YT;

    let hookState: ReturnType<typeof useYoutubeTransport> | null = null;
    render(createElement(Harness, { onUpdate: (state) => { hookState = state; } }));

    await waitFor(() => expect(window.YT?.Player as jest.Mock).toHaveBeenCalled());

    act(() => {
      playerOptions?.events?.onReady?.({ target: player });
    });

    act(() => {
      hookState?.transport.seek(37.5);
    });

    expect(seekTo).toHaveBeenCalledWith(37.5, true);
    expect(hookState?.transport.currentTime).toBe(37.5);
  });
});
