import {jest} from '@jest/globals';
import makeTaskRunner from '../lib/task-runner.js';

describe('Task runner', function () {
    // To test the output, we need to mock `console.log()` so it can be captured and read

    const log = console.log;

    beforeEach(() => {
        console.log = jest.fn(); // create a new mock function for each test
    });

    afterAll(() => {
        console.log = log; // restore original console.log after all tests
    });

    test('Runs tasks', async function () {
        let results = [];

        const testTasks = [
            {
                title: 'Task 1',
                task: () => {
                    results.push('Result from task 1');
                }
            },
            {
                title: 'Task 2',
                task: () => {
                    results.push('Result from task 2');
                }
            },
            {
                title: 'Task 3',
                task: () => {
                    results.push('Result from task 3');
                }
            }
        ];

        const taskRunner = makeTaskRunner(testTasks, {
            verbose: true
        });

        await taskRunner.run();

        const message = console.log.mock.calls; // Get calls to the mocked console.log

        expect(message).toEqual([
            ["[STARTED] Task 1"],
            ["[STARTED] Task 2"],
            ["[STARTED] Task 3"],
            ["[SUCCESS] Task 1"],
            ["[SUCCESS] Task 2"],
            ["[SUCCESS] Task 3"]
        ]);

        expect(results[0]).toEqual('Result from task 1');
        expect(results[1]).toEqual('Result from task 2');
        expect(results[2]).toEqual('Result from task 3');
    });

    test('Runs subtasks', async function () {
        let results = [];

        const testTasks = [
            {
                title: 'Task 1',
                task: () => {
                    results.push('Result from task 1');
                }
            },
            {
                title: 'Task 2',
                task: (ctx, task) => {
                    return task.newListr(
                        [
                            {
                                title: 'This is subtask 2.1',
                                task: () => {
                                    results.push('Result from subtask 2.1');
                                }
                            },
                            {
                                title: 'This is subtask 2.2',
                                task: () => {
                                    results.push('Result from subtask 2.2');
                                }
                            }
                        ]
                    )
                }
            }
        ];

        const taskRunner = makeTaskRunner(testTasks, {
            verbose: true
        });

        await taskRunner.run();

        const message = console.log.mock.calls; // Get calls to the mocked console.log

        expect(message).toEqual([
            ["[STARTED] Task 1"],
            ["[STARTED] Task 2"],
            ["[SUCCESS] Task 1"],
            ["[STARTED] This is subtask 2.1"],
            ["[SUCCESS] This is subtask 2.1"],
            ["[STARTED] This is subtask 2.2"],
            ["[SUCCESS] This is subtask 2.2"],
            ["[SUCCESS] Task 2" ]
        ]);

        expect(results[0]).toEqual('Result from task 1');
        expect(results[1]).toEqual('Result from subtask 2.1');
        expect(results[2]).toEqual('Result from subtask 2.2');
    });

    test('Runs async tasks out of order', async function () {
        let results = [];

        const testTasks = [
            {
                title: 'Task 1',
                task: async () => {
                    await new Promise(r => setTimeout(r, 50));
                    results.push('Result from task 1');
                }
            },
            {
                title: 'Task 2',
                task: async () => {
                    await new Promise(r => setTimeout(r, 100));
                    results.push('Result from task 2');
                }
            },
            {
                title: 'Task 3',
                task: async () => {
                    await new Promise(r => setTimeout(r, 50));
                    results.push('Result from task 3');
                }
            }
        ];

        const taskRunner = makeTaskRunner(testTasks, {
            verbose: true
        });

        await taskRunner.run();

        const message = console.log.mock.calls; // Get calls to the mocked console.log

        expect(message).toEqual([
            ["[STARTED] Task 1"],
            ["[STARTED] Task 2"],
            ["[STARTED] Task 3"],
            ["[SUCCESS] Task 1"],
            ["[SUCCESS] Task 3"],
            ["[SUCCESS] Task 2"]
        ]);

        expect(results[0]).toEqual('Result from task 1');
        expect(results[1]).toEqual('Result from task 3');
        expect(results[2]).toEqual('Result from task 2');
    });
});

