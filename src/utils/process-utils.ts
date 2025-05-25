/**
 * Process execution utilities
 */

import { execa } from "execa";

export async function runCommand(
  command: string, 
  args: string[], 
  options: { cwd?: string } = {}
): Promise<{ success: boolean; output: string; error?: string }> {
  try {
    const result = await execa(command, args, options);
    return { success: true, output: result.stdout };
  } catch (error: any) {
    return { 
      success: false, 
      output: error.stdout || "", 
      error: error.stderr || error.message 
    };
  }
}
