import { applyYoutubePlaybackRate } from "@/hooks/useYoutubeTransport";


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
