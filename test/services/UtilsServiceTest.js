const { expect } = require("chai");

var underTest = utils.underTest(__filename);

describe("UtilsService", () => {
  it("throws an error when there is a missing field", () => {
    expect(() =>
      underTest.checkMissingFields(["id", "name", "email"], {})
    ).to.throw("Mandatory field(s) is/are missing: id,name,email");
    expect(() => underTest.checkMissingFields(["id", "name"], {})).to.throw(
      "Mandatory field(s) is/are missing: id,name"
    );
  });
  it("doesn't throw an error when there all required field", () => {
    expect(() =>
      underTest.checkMissingFields(["id", "name"], { id: 1, name: "test" })
    ).to.not.throw("Mandatory field(s) is/are missing: id,name,email");
  });

  it("find all the email in a string", () => {
    const emails = underTest.getEmailFromString(
      "this is my emails contact@krysalead.com, KRYSALEAD@gmail.com"
    );
    expect(emails.length).to.equal(2);
  });

  it("validate email format", () => {
    const isValid = underTest.isValidEmail("KRYSALEAD@gmail.com");
    expect(isValid).to.equal(true);
  });

  describe.only("jsonWalker", () => {
    it("can walk an empty object", () => {
      const result = underTest.jsonWalker({}, "this.test");
      expect(result).to.equal(undefined);
    });
    it("can walk inside a simple object to get a boolean", () => {
      const result = underTest.jsonWalker({ a: { b: true } }, "a.b");
      expect(result).to.equal(true);
    });
    it("can walk inside a simple object to get a number", () => {
      const result = underTest.jsonWalker({ a: { b: 1 } }, "a.b");
      expect(result).to.equal(1);
    });
    it("can walk inside a simple array in an object", () => {
      const result = underTest.jsonWalker(
        { a: { b: [{ c: "test" }, { c: "test1" }] } },
        "a.b[1].c"
      );
      expect(result).to.equal("test1");
    });
  });
});
