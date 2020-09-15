var underTest = utils.underTest(__filename);

describe("CLSService", () => {
  it("set and get from a session", (done) => {
    underTest.wrap((val) => {
      underTest.set("unittest", val);
      setTimeout(() => {
        let storedValue = underTest.get("unittest");
        expect(storedValue).to.equals(510);
        done();
      }, 100);
    })(510);
  });
});
