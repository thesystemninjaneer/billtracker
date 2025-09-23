describe('Bill Management & Payments', () => {
    beforeEach(() => {
        // Log in and ensure a clean slate with a test org
        cy.login('testuser', 'password123');
        cy.createOrganizationViaAPI({ name: 'deletemeorg', accountNumber: '123' });
    });

    it('should create a recurring bill and verify its display', () => {
        // 1. UI Action: Navigate to add a bill and fill out the form
        cy.visit('/');
        cy.get('[data-cy="add-bill-button"]').click();
        cy.get('[data-cy="bill-org-select"]').select('deletemeorg');
        cy.get('[data-cy="bill-type-select"]').select('Recurring');
        cy.get('[data-cy="create-bill-button"]').click();

        // 2. UI Verification: Check for the "Record Payment" button next to the org
        cy.get('[data-cy="org-row-deletemeorg"]').within(() => {
            cy.get('[data-cy="record-payment-button"]').should('be.visible');
        });

        // 3. Backend Verification: Verify a new row in the bills table
        cy.task('dbQuery', 'SELECT * FROM bills WHERE org_name = "deletemeorg"').then((result) => {
            expect(result.length).to.equal(1);
        });
    });

    it('should record a recurring bill payment', () => {
        // Prerequisite: Create the recurring bill first
        cy.createRecurringBillViaAPI({ orgName: 'deletemeorg' });

        // 1. UI Action: Click the "Record Payment" button
        cy.visit('/');
        cy.get('[data-cy="org-row-deletemeorg"]').find('[data-cy="record-payment-button"]').click();
        cy.get('[data-cy="payment-amount-input"]').type('1');
        cy.get('[data-cy="payment-date-input"]').type('01/01/2001');
        cy.get('[data-cy="submit-payment-button"]').click();

        // 2. UI Verification: Check for the new payment in the "Recently Paid Bills" section
        cy.get('[data-cy="recently-paid-bills"]').within(() => {
            cy.contains('deletemeorg').should('be.visible');
            cy.contains('$1.00').should('be.visible');
            cy.contains('1/1/2001').should('be.visible');
        });

        // 3. Backend Verification: Verify a new row in the payments table
        cy.task('dbQuery', 'SELECT * FROM payments WHERE amount = 1.00 AND date = "2001-01-01"').then((result) => {
            expect(result.length).to.equal(1);
        });
    });

    it('should record an ad hoc payment', () => {
        // 1. UI Action: Click the "Record Payment" button for an org with no recurring bill
        cy.visit('/');
        cy.get('[data-cy="org-row-deletemeorg"]').find('[data-cy="record-payment-button"]').click();
        cy.get('[data-cy="payment-amount-input"]').type('0.99');
        cy.get('[data-cy="payment-date-input"]').type('09/09/2001');
        cy.get('[data-cy="submit-payment-button"]').click();

        // 2. UI Verification: Check for the new payment in the "Recently Paid Bills" section
        cy.get('[data-cy="recently-paid-bills"]').within(() => {
            cy.contains('deletemeorg').should('be.visible');
            cy.contains('$0.99').should('be.visible');
            cy.contains('9/9/2001').should('be.visible');
        });

        // 3. Backend Verification: Verify the payment record exists
        cy.task('dbQuery', 'SELECT * FROM payments WHERE amount = 0.99 AND date = "2001-09-09"').then((result) => {
            expect(result.length).to.equal(1);
        });
    });

    it('should delete a recurring bill', () => {
        // Prerequisite: Create the recurring bill
        cy.createRecurringBillViaAPI({ orgName: 'deletemeorg' });

        // 1. UI Action: Locate the bill and click the delete button
        cy.visit('/');
        cy.get('[data-cy="org-row-deletemeorg"]').find('[data-cy="edit-bill-button"]').click();
        cy.get('[data-cy="delete-bill-button"]').click();

        // 2. UI Verification: Check for the absence of the "Record Payment" button
        cy.get('[data-cy="org-row-deletemeorg"]').within(() => {
            cy.get('[data-cy="record-payment-button"]').should('not.exist');
        });

        // 3. Backend Verification: Verify the bill record is deleted
        cy.task('dbQuery', 'SELECT * FROM bills WHERE org_name = "deletemeorg"').then((result) => {
            expect(result.length).to.equal(0);
        });
    });
});
