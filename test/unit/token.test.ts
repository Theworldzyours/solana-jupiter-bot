import { TokenUtils } from "../../src/utils/token";

describe("TokenUtils", () => {
    describe("formatTokenAmount", () => {
        it("should correctly format token amount with default decimal places", () => {
            const result = TokenUtils.formatTokenAmount(123456.789012, 6);
            expect(result).toBe("123,456.79");
        });

        it("should correctly format token amount with custom decimal places", () => {
            const result = TokenUtils.formatTokenAmount(123456.789012, 6, 4);
            expect(result).toBe("123,456.7890");
        });

        it("should handle zero amount", () => {
            const result = TokenUtils.formatTokenAmount(0, 6);
            expect(result).toBe("0.00");
        });

        it("should handle very small amounts", () => {
            const result = TokenUtils.formatTokenAmount(0.0000123, 6);
            expect(result).toBe("0.00");
        });

        it("should handle very large amounts", () => {
            const result = TokenUtils.formatTokenAmount(1234567890.123456, 6);
            expect(result).toBe("1,234,567,890.12");
        });
    });

    // Additional tests can be added here for other TokenUtils methods
});