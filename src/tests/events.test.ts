import { EventBus, EventType } from "../core/events";

describe("EventBus", () => {
	let eventBus: EventBus;

	beforeEach(() => {
		// Reset the EventBus instance for each test
		// @ts-ignore - Access private static instance for testing purposes
		EventBus.instance = undefined;

		eventBus = EventBus.getInstance();
	});

	it("should be a singleton", () => {
		const instance1 = EventBus.getInstance();
		const instance2 = EventBus.getInstance();

		expect(instance1).toBe(instance2);
	});

	it("should emit and receive events", (done) => {
		const testData = { message: "Hello, World!" };

		eventBus.on(EventType.SYSTEM_READY, (data) => {
			expect(data).toEqual(testData);
			done();
		});

		eventBus.emit(EventType.SYSTEM_READY, testData);
	});

	it("should handle once events", () => {
		let callCount = 0;

		eventBus.once(EventType.SYSTEM_READY, () => {
			callCount++;
		});

		eventBus.emit(EventType.SYSTEM_READY);
		eventBus.emit(EventType.SYSTEM_READY);

		expect(callCount).toBe(1);
	});

	it("should remove event listeners", () => {
		let callCount = 0;

		const handler = () => {
			callCount++;
		};

		eventBus.on(EventType.SYSTEM_READY, handler);
		eventBus.emit(EventType.SYSTEM_READY);
		expect(callCount).toBe(1);

		eventBus.off(EventType.SYSTEM_READY, handler);
		eventBus.emit(EventType.SYSTEM_READY);
		expect(callCount).toBe(1); // Still 1, not incremented
	});

	it("should remove all listeners for an event", () => {
		let callCount1 = 0;
		let callCount2 = 0;

		eventBus.on(EventType.SYSTEM_READY, () => {
			callCount1++;
		});

		eventBus.on(EventType.SYSTEM_READY, () => {
			callCount2++;
		});

		eventBus.emit(EventType.SYSTEM_READY);
		expect(callCount1).toBe(1);
		expect(callCount2).toBe(1);

		eventBus.removeAllListeners(EventType.SYSTEM_READY);
		eventBus.emit(EventType.SYSTEM_READY);
		expect(callCount1).toBe(1); // Still 1, not incremented
		expect(callCount2).toBe(1); // Still 1, not incremented
	});
});
