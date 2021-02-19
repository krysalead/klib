var underTest = utils.underTest(__filename);

describe("ConfigService", () => {
  it("read the config from env", () => {
    expect(underTest("klib").STRING_PARAM).to.equal("This is a string 123");
    expect(underTest("klib").BOOLEAN_PARAM).to.equal(false);
    expect(underTest("klib").INTEGER_PARAM).to.equal(4545);
    expect(underTest("klib").version).to.equal("1");
    expect(underTest("klib").serviceName).to.equal("k-dk");
  });
  it("handles the parameter overriden by the system", () => {
    global.app_config = undefined;
    process.env.OVERRIDEN_PARAM = 65265;
    expect(underTest("klib").OVERRIDEN_PARAM).to.equal(65265);
  });
});
