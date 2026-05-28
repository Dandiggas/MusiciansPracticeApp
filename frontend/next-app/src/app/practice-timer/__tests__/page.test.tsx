import PracticeTimerRedirectPage from "../page";
import { redirect } from "next/navigation";

jest.mock("next/navigation", () => ({
  redirect: jest.fn(),
}));

describe("PracticeTimerRedirectPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("redirects legacy practice timer traffic to sessions", () => {
    PracticeTimerRedirectPage();

    expect(redirect).toHaveBeenCalledWith("/sessions");
  });
});
