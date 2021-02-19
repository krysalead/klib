var underTest = utils.underTest(__filename);

describe("StringService", () => {
  it("calculate distance between 2 similar strings", () => {
    expect(underTest.getDistance("This is a test", "This is")).to.equal(7);
  });

  it("returns a high number for string stricly different", () => {
    expect(
      underTest.getDistance("this is a test", "The test is nothing")
    ).to.equal(99);
  });
});
