describe("smoke tests", () => {
  it("should render index", () => {
    cy.visitAndCheck("/");
  });
});
