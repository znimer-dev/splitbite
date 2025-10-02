"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SplitCalculationService = void 0;
class SplitCalculationService {
    /**
     * Calculate split for each person based on assigned items
     */
    static calculateSplit(receipt) {
        const { people, items, tax, tip, taxDistribution, tipDistribution } = receipt;
        if (!people || people.length === 0) {
            throw new Error('No people found in receipt');
        }
        // Initialize split for each person
        const splits = new Map();
        people.forEach(person => {
            splits.set(person.id, {
                personId: person.id,
                name: person.name,
                subtotal: 0,
                taxShare: 0,
                tipShare: 0,
                total: 0,
                items: []
            });
        });
        // Calculate each person's subtotal based on assigned items
        items.forEach(item => {
            const { assignedTo, name, price, quantity } = item;
            if (!assignedTo || assignedTo.length === 0) {
                // Item not assigned to anyone, skip
                return;
            }
            const totalItemPrice = price * quantity;
            const pricePerPerson = totalItemPrice / assignedTo.length;
            assignedTo.forEach(personId => {
                const personSplit = splits.get(personId);
                if (personSplit) {
                    personSplit.subtotal += pricePerPerson;
                    personSplit.items.push({
                        itemName: name,
                        fullPrice: totalItemPrice,
                        shareAmount: pricePerPerson,
                        sharedWith: assignedTo.filter(id => id !== personId)
                    });
                }
            });
        });
        // Calculate tax and tip distribution
        const totalSubtotalAssigned = Array.from(splits.values())
            .reduce((sum, split) => sum + split.subtotal, 0);
        splits.forEach(split => {
            if (taxDistribution === 'equal') {
                split.taxShare = tax / people.length;
            }
            else {
                // Proportional to their subtotal
                split.taxShare = totalSubtotalAssigned > 0
                    ? (split.subtotal / totalSubtotalAssigned) * tax
                    : 0;
            }
            if (tipDistribution === 'equal') {
                split.tipShare = tip / people.length;
            }
            else {
                // Proportional to their subtotal
                split.tipShare = totalSubtotalAssigned > 0
                    ? (split.subtotal / totalSubtotalAssigned) * tip
                    : 0;
            }
            split.total = split.subtotal + split.taxShare + split.tipShare;
        });
        return Array.from(splits.values());
    }
    /**
     * Check if all items are assigned to people
     */
    static isReceiptComplete(receipt) {
        if (!receipt.items || receipt.items.length === 0) {
            return false;
        }
        return receipt.items.every(item => item.assignedTo && item.assignedTo.length > 0);
    }
    /**
     * Get unassigned items
     */
    static getUnassignedItems(receipt) {
        if (!receipt.items) {
            return [];
        }
        return receipt.items
            .filter(item => !item.assignedTo || item.assignedTo.length === 0)
            .map(item => ({
            name: item.name,
            price: item.price,
            quantity: item.quantity
        }));
    }
    /**
     * Generate a shareable summary of the split
     */
    static generateShareableSummary(receipt, splits) {
        const { restaurantName, date, total } = receipt;
        const formattedDate = new Date(date).toLocaleDateString();
        let summary = `🍽️ ${restaurantName}\n`;
        summary += `📅 ${formattedDate}\n`;
        summary += `💰 Total: $${total.toFixed(2)}\n\n`;
        summary += `👥 Split between ${splits.length} people:\n`;
        splits.forEach(split => {
            summary += `• ${split.name}: $${split.total.toFixed(2)}\n`;
            if (split.items.length > 0) {
                split.items.forEach(item => {
                    const shared = item.sharedWith.length > 0 ? ` (shared)` : '';
                    summary += `  - ${item.itemName}: $${item.shareAmount.toFixed(2)}${shared}\n`;
                });
            }
        });
        summary += `\n📱 Processed with SplitBite`;
        return summary;
    }
    /**
     * Calculate savings compared to equal split
     */
    static calculateSavings(receipt, splits) {
        const equalSplit = receipt.total / receipt.people.length;
        return splits.map(split => ({
            personId: split.personId,
            savings: equalSplit - split.total
        }));
    }
    /**
     * Get statistics for the receipt
     */
    static getReceiptStats(receipt, splits) {
        const totalItems = receipt.items.length;
        const assignedItems = receipt.items.filter(item => item.assignedTo && item.assignedTo.length > 0).length;
        const sharedItems = receipt.items.filter(item => item.assignedTo && item.assignedTo.length > 1).length;
        const averagePerPerson = splits.length > 0
            ? splits.reduce((sum, split) => sum + split.total, 0) / splits.length
            : 0;
        const highestAmount = splits.length > 0
            ? Math.max(...splits.map(split => split.total))
            : 0;
        const lowestAmount = splits.length > 0
            ? Math.min(...splits.map(split => split.total))
            : 0;
        return {
            totalItems,
            assignedItems,
            unassignedItems: totalItems - assignedItems,
            sharedItems,
            averagePerPerson,
            highestAmount,
            lowestAmount,
            completionPercentage: totalItems > 0 ? (assignedItems / totalItems) * 100 : 0
        };
    }
}
exports.SplitCalculationService = SplitCalculationService;
exports.default = SplitCalculationService;
