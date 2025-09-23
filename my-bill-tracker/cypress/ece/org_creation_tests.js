describe('Organization Creation & Management', () => {
    beforeEach(() => {
        // Log in the test user before each test
        cy.login('testuser', 'password123');
    });

    it('should create an organization and verify its existence', () => {
        // 1. UI Action: Navigate to the "Add Org" form and fill it out
        cy.visit('/');
        cy.get('[data-cy="add-org-link"]').click();
        cy.get('[data-cy="org-name-input"]').type('deletemeorg');
        cy.get('[data-cy="org-account-number-input"]').type('123');
        cy.get('[data-cy="org-due-date-select"]').type('1');
        cy.get('[data-cy="create-org-button"]').click();

        // 2. UI Verification: Check if the organization is displayed in the list
        cy.get('[data-cy="your-bill-organizations"]').within(() => {
            cy.contains('deletemeorg').should('be.visible');
        });

        // 3. Backend Verification (Optional but Recommended): Verify a new row exists in the database
        // This requires a custom command or a direct API call from Cypress
        cy.task('dbQuery', 'SELECT * FROM organizations WHERE name = "deletemeorg"').then((result) => {
            expect(result.length).to.equal(1);
        });
    });

    it('should delete an organization and verify its removal', () => {
        // Prerequisite: Ensure the organization exists before attempting to delete it
        cy.createOrganizationViaAPI({ name: 'deletemeorg', accountNumber: '123' });

        // 1. UI Action: Locate the organization and click the delete button
        cy.visit('/');
        cy.get('[data-cy="org-row-deletemeorg"]').find('[data-cy="edit-button"]').click();
        cy.get('[data-cy="delete-org-button"]').click();

        // 2. UI Verification: Check if the organization is no longer displayed
        cy.get('[data-cy="your-bill-organizations"]').within(() => {
            cy.contains('deletemeorg').should('not.exist');
        });

        // 3. Backend Verification (Optional): Verify the row is gone from the database
        cy.task('dbQuery', 'SELECT * FROM organizations WHERE name = "deletemeorg"').then((result) => {
            expect(result.length).to.equal(0);
        });
    });
});
